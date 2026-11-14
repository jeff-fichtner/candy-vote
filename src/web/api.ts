import type { Standings, Votes } from '../shared/ballot';

async function call(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path, init);
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} answered ${res.status}`);
  }
  return res;
}

/** Saves one kid's ballot. */
export async function saveBallot(votes: Votes): Promise<void> {
  await call('/api/ballots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ votes }),
  });
}

/** The current standings. */
export async function fetchStandings(): Promise<Standings> {
  const res = await call('/api/standings');
  return (await res.json()) as Standings;
}

/** Erases every ballot. */
export async function eraseBallots(): Promise<void> {
  await call('/api/ballots', { method: 'DELETE' });
}
