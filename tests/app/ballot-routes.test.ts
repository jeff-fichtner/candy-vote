// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/server.js';
import { memoryStore } from '../support/memory-store.js';

let store: ReturnType<typeof memoryStore>;
let app: Express;

beforeEach(() => {
  store = memoryStore();
  app = createApp(store);
});

describe('POST /api/ballots', () => {
  it('saves a valid ballot', async () => {
    const res = await request(app)
      .post('/api/ballots')
      .send({ votes: { reeses: 2, twix: 1 } });
    expect(res.status).toBe(201);
    expect(store.ballots).toEqual([{ reeses: 2, twix: 1 }]);
  });

  it('refuses a ballot with too many votes and saves nothing', async () => {
    const res = await request(app)
      .post('/api/ballots')
      .send({ votes: { reeses: 4 } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('a ballot has at most 3 votes, got 4');
    expect(store.ballots).toEqual([]);
  });

  it('refuses a request with no votes', async () => {
    const res = await request(app).post('/api/ballots').send({});
    expect(res.status).toBe(400);
    expect(store.ballots).toEqual([]);
  });
});

describe('GET /api/standings', () => {
  it('adds up the saved ballots', async () => {
    await request(app)
      .post('/api/ballots')
      .send({ votes: { kitkat: 3 } });
    await request(app)
      .post('/api/ballots')
      .send({ votes: { kitkat: 1, crunch: 2 } });
    const res = await request(app).get('/api/standings');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.voters).toBe(2);
    expect(res.body.rows[0]).toMatchObject({ id: 'kitkat', votes: 4, place: 1 });
    expect(res.body.rows[1]).toMatchObject({ id: 'crunch', votes: 2, place: 2 });
  });
});

describe('DELETE /api/ballots', () => {
  it('erases every ballot', async () => {
    await request(app)
      .post('/api/ballots')
      .send({ votes: { twix: 1 } });
    const res = await request(app).delete('/api/ballots');
    expect(res.status).toBe(200);
    const after = await request(app).get('/api/standings');
    expect(after.body.voters).toBe(0);
  });
});
