import { CANDIES, VOTES_PER_KID, type Candy } from './candies.js';

/** One kid's votes: candy id → how many of their votes it got (1 or more). */
export type Votes = Record<string, number>;

export type BallotCheck = { ok: true; votes: Votes } | { ok: false; error: string };

const candyIds = new Set(CANDIES.map((candy) => candy.id));

/**
 * Checks a ballot sent by the voting screen: an object of candy id → whole number of votes, each
 * at least 1, adding up to between 1 and VOTES_PER_KID.
 */
export function checkBallot(input: unknown): BallotCheck {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, error: 'votes must be an object of candy id to number of votes' };
  }
  const votes: Votes = {};
  let total = 0;
  for (const [id, count] of Object.entries(input)) {
    if (!candyIds.has(id)) {
      return { ok: false, error: `unknown candy: ${id}` };
    }
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) {
      return { ok: false, error: `votes for ${id} must be a whole number of at least 1` };
    }
    votes[id] = count;
    total += count;
  }
  if (total < 1) {
    return { ok: false, error: 'a ballot needs at least 1 vote' };
  }
  if (total > VOTES_PER_KID) {
    return { ok: false, error: `a ballot has at most ${VOTES_PER_KID} votes, got ${total}` };
  }
  return { ok: true, votes };
}

export interface StandingRow extends Candy {
  votes: number;
  /** 1 for the most votes. Candies with the same total share a place (1, 2, 2, 4). */
  place: number;
}

export interface Standings {
  /** How many ballots were cast. */
  voters: number;
  /** Every candy, most votes first; equal totals keep the ballot's order. */
  rows: StandingRow[];
}

/**
 * Adds up the ballots. A stored vote for a candy no longer on the list is not counted, so
 * removing a candy from the list removes its votes from the standings.
 */
export function standings(ballots: readonly Votes[]): Standings {
  const totals = new Map<string, number>(CANDIES.map((candy) => [candy.id, 0]));
  for (const votes of ballots) {
    for (const [id, count] of Object.entries(votes)) {
      const current = totals.get(id);
      if (current !== undefined) {
        totals.set(id, current + count);
      }
    }
  }
  const sorted = CANDIES.map((candy, order) => ({
    candy,
    order,
    votes: totals.get(candy.id) ?? 0,
  })).sort((a, b) => b.votes - a.votes || a.order - b.order);
  const rows: StandingRow[] = [];
  sorted.forEach((entry, index) => {
    const previous = rows[index - 1];
    const place = previous && previous.votes === entry.votes ? previous.place : index + 1;
    rows.push({ ...entry.candy, votes: entry.votes, place });
  });
  return { voters: ballots.length, rows };
}
