import type { Standings, Votes } from '../shared/ballot';
import { ownerHeaders } from './owner';

/** The standings plus whether voting is open, as GET /api/standings answers. */
export type Board = Standings & { votingOpen: boolean };

/** A request the server refused, with its status code. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(path, {
    ...init,
    headers: { ...ownerHeaders(), ...(init.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    throw new ApiError(`${init.method ?? 'GET'} ${path} answered ${res.status}`, res.status);
  }
  return res;
}

const jsonBody = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** Saves one kid's ballot. */
export async function saveBallot(votes: Votes): Promise<void> {
  await call('/api/ballots', jsonBody({ votes }));
}

/** The current standings and whether voting is open. */
export async function fetchBoard(): Promise<Board> {
  const res = await call('/api/standings');
  return (await res.json()) as Board;
}

/** Whether the server recognizes this device as the owner's. */
export async function fetchIsOwner(): Promise<boolean> {
  const res = await call('/api/me');
  return ((await res.json()) as { owner: boolean }).owner;
}

/** Starts or stops voting. */
export async function setVoting(open: boolean): Promise<void> {
  await call('/api/voting', jsonBody({ open }));
}

/** Erases every ballot. */
export async function eraseBallots(): Promise<void> {
  await call('/api/ballots', { method: 'DELETE' });
}
