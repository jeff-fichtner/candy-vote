// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  assertStoreReachable,
  openFirestoreStore,
  readStoreConfig,
} from '../../src/store/firestore.js';
import type { BallotStore } from '../../src/store/store.js';
import { startEmulator } from '../support/emulator.js';

const HOST = '127.0.0.1:8187';
const config = { projectId: 'demo-candy-vote', databaseId: 'candy-vote-test' };
let emulator: { stop: () => void };
let store: BallotStore;
const previousHost = process.env.FIRESTORE_EMULATOR_HOST;

beforeAll(async () => {
  emulator = await startEmulator(HOST);
  process.env.FIRESTORE_EMULATOR_HOST = HOST;
  store = openFirestoreStore(config);
}, 90_000);

afterAll(() => {
  emulator?.stop();
  if (previousHost === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
  else process.env.FIRESTORE_EMULATOR_HOST = previousHost;
});

describe('Firestore ballot store (emulator)', () => {
  it('starts empty, saves ballots, lists them and erases them', async () => {
    await store.clear();
    await assertStoreReachable(store, config);
    expect(await store.list()).toEqual([]);

    await store.add({ reeses: 3 });
    await store.add({ kitkat: 1, twix: 2 });
    const saved = await store.list();
    expect(saved).toHaveLength(2);
    expect(saved).toEqual(expect.arrayContaining([{ reeses: 3 }, { kitkat: 1, twix: 2 }]));

    await store.clear();
    expect(await store.list()).toEqual([]);
  });

  it('keeps voting closed until it is opened, and closes it again', async () => {
    expect(await store.votingOpen()).toBe(false);
    await store.setVotingOpen(true);
    expect(await store.votingOpen()).toBe(true);
    await store.setVotingOpen(false);
    expect(await store.votingOpen()).toBe(false);
  });
});

describe('readStoreConfig', () => {
  const base = { GCP_PROJECT: 'p', FIRESTORE_DATABASE: 'd' };

  it('reads the project and database', () => {
    expect(readStoreConfig(base)).toEqual({ projectId: 'p', databaseId: 'd' });
  });

  it.each(['GCP_PROJECT', 'FIRESTORE_DATABASE'])('stops when %s is missing', (name) => {
    expect(() => readStoreConfig({ ...base, [name]: undefined })).toThrow(
      `${name} is required and is not set.`,
    );
  });

  it.each(['GCP_PROJECT', 'FIRESTORE_DATABASE'])('stops when %s is blank', (name) => {
    expect(() => readStoreConfig({ ...base, [name]: '  ' })).toThrow(`${name} is required`);
  });

  it('stops when production is pointed at the emulator', () => {
    expect(() =>
      readStoreConfig({ ...base, NODE_ENV: 'production', FIRESTORE_EMULATOR_HOST: HOST }),
    ).toThrow('production never uses the Firestore emulator');
  });

  it('stops when the emulator host is blank', () => {
    expect(() => readStoreConfig({ ...base, FIRESTORE_EMULATOR_HOST: '' })).toThrow(
      'FIRESTORE_EMULATOR_HOST is blank',
    );
  });
});
