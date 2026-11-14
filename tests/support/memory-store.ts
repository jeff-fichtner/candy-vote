import type { Votes } from '../../src/shared/ballot.js';
import type { BallotStore } from '../../src/store/store.js';

/** A ballot store held in memory, for route tests that don't need Firestore. */
export function memoryStore(): BallotStore & { ballots: Votes[]; open: boolean } {
  const store = {
    ballots: [] as Votes[],
    open: false,
    async add(votes: Votes) {
      store.ballots.push(votes);
    },
    async list() {
      return [...store.ballots];
    },
    async clear() {
      store.ballots.length = 0;
    },
    async votingOpen() {
      return store.open;
    },
    async setVotingOpen(open: boolean) {
      store.open = open;
    },
  };
  return store;
}
