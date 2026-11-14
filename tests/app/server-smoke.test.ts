// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { createApp } from '../../src/server.js';
import { memoryStore } from '../support/memory-store.js';
import { ownerCheck } from '../../src/owner.js';

const isOwner = ownerCheck('smoke-test-owner-key-0123456789abcdef');

// Smoke test: the built frontend is served and the API responds.
const distIndex = fileURLToPath(new URL('../../dist/index.html', import.meta.url));

beforeAll(() => {
  if (!existsSync(distIndex)) {
    execFileSync('node', ['scripts/build.mjs'], { stdio: 'ignore' });
  }
});

describe('app serves', () => {
  it('serves the built frontend', async () => {
    const res = await request(createApp(memoryStore(), isOwner)).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<div id="root"');
  });

  it('answers the liveness check', async () => {
    const res = await request(createApp(memoryStore(), isOwner)).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
  });
});
