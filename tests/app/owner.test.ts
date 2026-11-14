// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readOwnerKey } from '../../src/owner.js';

const GOOD = 'k'.repeat(32);

describe('readOwnerKey', () => {
  it('reads a key of 32 characters or more', () => {
    expect(readOwnerKey({ OWNER_KEY: GOOD })).toBe(GOOD);
  });

  it.each([undefined, '', '   '])('stops when OWNER_KEY is %j', (value) => {
    expect(() => readOwnerKey({ OWNER_KEY: value })).toThrow('OWNER_KEY is required');
  });

  it('stops when the key is shorter than 32 characters', () => {
    expect(() => readOwnerKey({ OWNER_KEY: 'k'.repeat(31) })).toThrow(
      'OWNER_KEY must be at least 32 characters',
    );
  });

  it('accepts the local development key outside production', () => {
    const local = 'local-owner-key-for-the-emulator-only';
    expect(readOwnerKey({ OWNER_KEY: local })).toBe(local);
  });

  it('refuses the local development key in production', () => {
    expect(() =>
      readOwnerKey({ OWNER_KEY: 'local-owner-key-for-the-emulator-only', NODE_ENV: 'production' }),
    ).toThrow('OWNER_KEY is the local development key');
  });
});
