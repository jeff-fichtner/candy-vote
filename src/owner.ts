/**
 * The owner device: the one device that can start and stop voting, take votes and erase them.
 * Every other device only reads the standings.
 *
 * The device proves it is the owner by sending `OWNER_KEY` as a bearer token. It gets the key once,
 * from a setup link (`/#owner=<key>`) opened on it, and keeps it in its browser storage. The key is
 * required, with no default: an unset key would leave nothing able to vote, and a guessable one
 * would let anyone erase the votes. Under NODE_ENV=production the local development key is refused.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { required } from './config.js';

/**
 * The committed local `.env` sets a key starting with this. It unlocks only the local emulator, and
 * anyone can read it in the repository, so production refuses it.
 */
const LOCAL_KEY_PREFIX = 'local-';

/** The shortest key accepted: 32 characters of random text. */
const MIN_KEY_LENGTH = 32;

/** Reads OWNER_KEY, or throws naming it when it is unset, blank or shorter than 32 characters. */
export function readOwnerKey(env: Record<string, string | undefined>): string {
  const key = required(env, 'OWNER_KEY');
  if (env.NODE_ENV === 'production' && key.startsWith(LOCAL_KEY_PREFIX)) {
    throw new Error(
      `OWNER_KEY is the local development key (it starts with "${LOCAL_KEY_PREFIX}"), which is ` +
        'public in the repository. Production needs its own key from Secret Manager.',
    );
  }
  if (key.length < MIN_KEY_LENGTH) {
    throw new Error(`OWNER_KEY must be at least ${MIN_KEY_LENGTH} characters of random text.`);
  }
  return key;
}

const digest = (value: string) => createHash('sha256').update(value).digest();

/** Tells whether a request comes from the owner device. */
export type OwnerCheck = (req: Request) => boolean;

/** Builds the check for `key`: the request's bearer token must equal it. */
export function ownerCheck(key: string): OwnerCheck {
  const expected = digest(key);
  return (req) => {
    const match = /^Bearer (.+)$/.exec(req.get('authorization') ?? '');
    return match !== null && timingSafeEqual(digest(match[1]), expected);
  };
}

/** Express middleware: answers 403 unless the request comes from the owner device. */
export function requireOwner(isOwner: OwnerCheck) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isOwner(req)) {
      next();
      return;
    }
    res.status(403).json({ error: 'only the owner device can do this' });
  };
}
