/**
 * Ballots in Firestore: one document per ballot in the `ballots` collection of the named database
 * `FIRESTORE_DATABASE` in `GCP_PROJECT`, and the Firestore emulator locally.
 *
 * `GCP_PROJECT` and `FIRESTORE_DATABASE` are required, with no defaults: either one wrong would
 * read or write another environment's votes. The emulator is used only when
 * `FIRESTORE_EMULATOR_HOST` is set, which the local `.env` does explicitly; the Firestore client
 * itself reads that variable. Under `NODE_ENV=production` (the image sets it) a set
 * `FIRESTORE_EMULATOR_HOST` stops startup: production never talks to an emulator.
 */
import { Firestore, FieldValue } from '@google-cloud/firestore';
import { required } from '../config.js';
import type { Votes } from '../shared/ballot.js';
import type { BallotStore } from './store.js';

export interface StoreConfig {
  projectId: string;
  databaseId: string;
}

/** Reads and checks the database settings, or throws naming the one that is wrong. */
export function readStoreConfig(env: Record<string, string | undefined>): StoreConfig {
  const projectId = required(env, 'GCP_PROJECT');
  const databaseId = required(env, 'FIRESTORE_DATABASE');
  const emulator = env.FIRESTORE_EMULATOR_HOST;
  if (env.NODE_ENV === 'production' && emulator !== undefined) {
    throw new Error(
      'FIRESTORE_EMULATOR_HOST is set under NODE_ENV=production: production never uses the ' +
        'Firestore emulator. Unset it.',
    );
  }
  if (emulator !== undefined && emulator.trim() === '') {
    throw new Error(
      'FIRESTORE_EMULATOR_HOST is blank: set it to the emulator host:port, or unset it.',
    );
  }
  return { projectId, databaseId };
}

/**
 * The configured database: ballots in the `ballots` collection, and the voting switch in the
 * `settings/voting` document (absent means closed).
 */
export function openFirestoreStore(config: StoreConfig): BallotStore {
  const db = new Firestore({ projectId: config.projectId, databaseId: config.databaseId });
  const ballots = db.collection('ballots');
  const voting = db.collection('settings').doc('voting');
  return {
    async votingOpen() {
      const snapshot = await voting.get();
      return snapshot.get('open') === true;
    },
    async setVotingOpen(open: boolean) {
      await voting.set({ open, changedAt: FieldValue.serverTimestamp() });
    },
    async add(votes: Votes) {
      await ballots.add({ votes, castAt: FieldValue.serverTimestamp() });
    },
    async list() {
      const snapshot = await ballots.get();
      return snapshot.docs.map((doc) => doc.get('votes') as Votes);
    },
    async clear() {
      await db.recursiveDelete(ballots);
    },
  };
}

/**
 * Reads the ballots once, so a database that does not exist or cannot be reached stops startup
 * naming it, rather than failing at the first vote.
 */
export async function assertStoreReachable(store: BallotStore, config: StoreConfig): Promise<void> {
  try {
    await store.list();
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    throw new Error(
      `Firestore database ${config.databaseId} in ${config.projectId} cannot be read` +
        (typeof code === 'number' ? ` (gRPC status ${code}).` : '.'),
      { cause: error },
    );
  }
}
