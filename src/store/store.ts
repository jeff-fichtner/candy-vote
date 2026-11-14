import type { Votes } from '../shared/ballot.js';

/** Where ballots are kept. The server talks only to this. */
export interface BallotStore {
  /** Saves one kid's ballot. */
  add(votes: Votes): Promise<void>;
  /** Every saved ballot. */
  list(): Promise<Votes[]>;
  /** Erases every ballot. */
  clear(): Promise<void>;
}
