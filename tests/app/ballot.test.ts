// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { checkBallot, standings, type Votes } from '../../src/shared/ballot.js';
import { CANDIES } from '../../src/shared/candies.js';

describe('checkBallot', () => {
  it('accepts three votes on three candies', () => {
    expect(checkBallot({ reeses: 1, twix: 1, kitkat: 1 })).toEqual({
      ok: true,
      votes: { reeses: 1, twix: 1, kitkat: 1 },
    });
  });

  it('accepts all three votes on one candy', () => {
    expect(checkBallot({ snickers: 3 })).toEqual({ ok: true, votes: { snickers: 3 } });
  });

  it('accepts a single vote', () => {
    expect(checkBallot({ crunch: 1 })).toEqual({ ok: true, votes: { crunch: 1 } });
  });

  it('refuses more than three votes', () => {
    expect(checkBallot({ reeses: 2, twix: 2 })).toEqual({
      ok: false,
      error: 'a ballot has at most 3 votes, got 4',
    });
  });

  it('refuses an empty ballot', () => {
    expect(checkBallot({})).toEqual({ ok: false, error: 'a ballot needs at least 1 vote' });
  });

  it('refuses a candy that is not on the list', () => {
    expect(checkBallot({ broccoli: 1 })).toEqual({ ok: false, error: 'unknown candy: broccoli' });
  });

  it.each([0, -1, 1.5, '2', null])('refuses %j as a vote count', (count) => {
    const check = checkBallot({ reeses: count });
    expect(check.ok).toBe(false);
  });

  it.each([null, 'reeses', ['reeses'], 3])('refuses %j as a ballot', (input) => {
    expect(checkBallot(input).ok).toBe(false);
  });
});

describe('standings', () => {
  it('lists every candy with zero votes when nobody has voted', () => {
    const result = standings([]);
    expect(result.voters).toBe(0);
    expect(result.rows).toHaveLength(CANDIES.length);
    expect(result.rows.every((row) => row.votes === 0 && row.place === 1)).toBe(true);
    expect(result.rows.map((row) => row.id)).toEqual(CANDIES.map((candy) => candy.id));
  });

  it('ranks candies by total votes across ballots', () => {
    const ballots: Votes[] = [
      { reeses: 3 },
      { kitkat: 2, reeses: 1 },
      { kitkat: 1, twix: 1, snickers: 1 },
      { twix: 2, mms: 1 },
    ];
    const result = standings(ballots);
    expect(result.voters).toBe(4);
    expect(result.rows.slice(0, 5).map((row) => [row.id, row.votes, row.place])).toEqual([
      ['reeses', 4, 1],
      ['kitkat', 3, 2],
      ['twix', 3, 2],
      ['snickers', 1, 4],
      ['mms', 1, 4],
    ]);
  });

  it('gives tied candies the same place and keeps the ballot order between them', () => {
    const result = standings([{ cookies: 1, reeses: 1 }]);
    expect(result.rows[0]).toMatchObject({ id: 'reeses', votes: 1, place: 1 });
    expect(result.rows[1]).toMatchObject({ id: 'cookies', votes: 1, place: 1 });
    expect(result.rows[2]).toMatchObject({ votes: 0, place: 3 });
  });

  it('does not count votes for a candy no longer on the list', () => {
    const result = standings([{ almondjoy: 3 }, { twix: 1 }]);
    expect(result.voters).toBe(2);
    expect(result.rows[0]).toMatchObject({ id: 'twix', votes: 1, place: 1 });
    expect(result.rows.find((row) => row.id === 'almondjoy')).toBeUndefined();
  });

  it('adds up a full set of sample ballots to the expected totals', () => {
    const ballots: Votes[] = [];
    for (let i = 0; i < 23; i++) {
      ballots.push(i % 2 === 0 ? { reeses: 2, kitkat: 1 } : { snickers: 1, twix: 1, mms: 1 });
    }
    const result = standings(ballots);
    const total = result.rows.reduce((sum, row) => sum + row.votes, 0);
    expect(total).toBe(12 * 3 + 11 * 3);
    expect(result.rows.slice(0, 2).map((row) => [row.id, row.votes])).toEqual([
      ['reeses', 24],
      ['kitkat', 12],
    ]);
  });
});
