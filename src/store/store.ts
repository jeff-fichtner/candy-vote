import type { Votes } from '../shared/ballot.js';

/** Where ballots and the voting switch are kept. The server talks only to this. */
export interface BallotStore {
  /** Saves one kid's ballot. */
  add(votes: Votes): Promise<void>;
  /** Every saved ballot. */
  list(): Promise<Votes[]>;
  /** Erases every ballot. */
  clear(): Promise<void>;
  /** Whether voting is open. Closed until the owner opens it. */
  votingOpen(): Promise<boolean>;
  /** Opens or closes voting. */
  setVotingOpen(open: boolean): Promise<void>;
}
