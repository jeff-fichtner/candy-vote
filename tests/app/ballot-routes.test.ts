// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/server.js';
import { ownerCheck } from '../../src/owner.js';
import { memoryStore } from '../support/memory-store.js';

const KEY = 'test-owner-key-0123456789abcdefghijklmnop';
const OWNER = { Authorization: `Bearer ${KEY}` };
let store: ReturnType<typeof memoryStore>;
let app: Express;

beforeEach(() => {
  store = memoryStore();
  app = createApp(store, ownerCheck(KEY));
});

describe('GET /api/me', () => {
  it('recognizes the owner device by its key', async () => {
    expect((await request(app).get('/api/me').set(OWNER)).body).toEqual({ owner: true });
  });

  it.each([
    ['no key', {}],
    ['a wrong key', { Authorization: 'Bearer not-the-key' }],
    ['a key without Bearer', { Authorization: KEY }],
  ])('says not the owner for %s', async (_name, headers) => {
    expect((await request(app).get('/api/me').set(headers)).body).toEqual({ owner: false });
  });
});

describe('POST /api/voting', () => {
  it('lets the owner start and stop voting', async () => {
    const start = await request(app).post('/api/voting').set(OWNER).send({ open: true });
    expect(start.status).toBe(200);
    expect(store.open).toBe(true);
    await request(app).post('/api/voting').set(OWNER).send({ open: false });
    expect(store.open).toBe(false);
  });

  it('refuses anyone else', async () => {
    const res = await request(app).post('/api/voting').send({ open: true });
    expect(res.status).toBe(403);
    expect(store.open).toBe(false);
  });

  it('refuses a value that is not true or false', async () => {
    const res = await request(app).post('/api/voting').set(OWNER).send({ open: 'yes' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/ballots', () => {
  beforeEach(() => {
    store.open = true;
  });

  it('saves a valid ballot from the owner device while voting is open', async () => {
    const res = await request(app)
      .post('/api/ballots')
      .set(OWNER)
      .send({ votes: { reeses: 2, twix: 1 } });
    expect(res.status).toBe(201);
    expect(store.ballots).toEqual([{ reeses: 2, twix: 1 }]);
  });

  it('refuses a ballot from any other device', async () => {
    const res = await request(app)
      .post('/api/ballots')
      .send({ votes: { reeses: 1 } });
    expect(res.status).toBe(403);
    expect(store.ballots).toEqual([]);
  });

  it('refuses a ballot while voting is closed', async () => {
    store.open = false;
    const res = await request(app)
      .post('/api/ballots')
      .set(OWNER)
      .send({ votes: { reeses: 1 } });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('voting is closed');
    expect(store.ballots).toEqual([]);
  });

  it('refuses a ballot with too many votes and saves nothing', async () => {
    const res = await request(app)
      .post('/api/ballots')
      .set(OWNER)
      .send({ votes: { reeses: 4 } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('a ballot has at most 3 votes, got 4');
    expect(store.ballots).toEqual([]);
  });

  it('refuses a request with no votes', async () => {
    const res = await request(app).post('/api/ballots').set(OWNER).send({});
    expect(res.status).toBe(400);
    expect(store.ballots).toEqual([]);
  });
});

describe('GET /api/standings', () => {
  it('adds up the saved ballots and says whether voting is open, for anyone', async () => {
    store.ballots.push({ kitkat: 3 }, { kitkat: 1, crunch: 2 });
    const res = await request(app).get('/api/standings');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.voters).toBe(2);
    expect(res.body.votingOpen).toBe(false);
    expect(res.body.rows[0]).toMatchObject({ id: 'kitkat', votes: 4, place: 1 });
    expect(res.body.rows[1]).toMatchObject({ id: 'crunch', votes: 2, place: 2 });
  });
});

describe('DELETE /api/ballots', () => {
  it('lets the owner erase every ballot', async () => {
    store.ballots.push({ twix: 1 });
    const res = await request(app).delete('/api/ballots').set(OWNER);
    expect(res.status).toBe(200);
    expect(store.ballots).toEqual([]);
  });

  it('refuses anyone else and keeps the ballots', async () => {
    store.ballots.push({ twix: 1 });
    const res = await request(app).delete('/api/ballots');
    expect(res.status).toBe(403);
    expect(store.ballots).toEqual([{ twix: 1 }]);
  });
});
