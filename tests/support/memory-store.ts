import type { Votes } from '../../src/shared/ballot.js';
import type { BallotStore } from '../../src/store/store.js';

/** A ballot store held in memory, for route tests that don't need Firestore. */
export function memoryStore(): BallotStore & { ballots: Votes[] } {
  const ballots: Votes[] = [];
  return {
    ballots,
    async add(votes) {
      ballots.push(votes);
    },
    async list() {
      return [...ballots];
    },
    async clear() {
      ballots.length = 0;
    },
  };
}
