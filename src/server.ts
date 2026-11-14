import express, { type Express } from 'express';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { PORT } from './config.js';
import { BAKED } from './env.generated.js';
import { registerRoutes } from './routes/index.js';
import type { BallotStore } from './store/store.js';
import { assertStoreReachable, openFirestoreStore, readStoreConfig } from './store/firestore.js';

// The built frontend always lives in dist/ at the app root, regardless of whether
// this file runs from source (dev) or compiled (prod), so resolve it from the
// working directory rather than this file's location.
const distDir = resolve(process.cwd(), 'dist');

/** Builds the Express app that serves the vote API and the built frontend from dist/. */
export function createApp(store: BallotStore): Express {
  const app = express();

  // A non-public environment (e.g. staging) is publicly reachable — it serves exactly like
  // production — but must not be indexed by search engines, or it competes with production as
  // duplicate content. Keyed on the BAKED environment's `noindex` facet (decided at build from
  // environments.json), so an environment that opts into noindex emits the header and a public
  // environment does not. Registered before any route/static so it covers every response.
  app.use((_req, res, next) => {
    if (BAKED.noindex) res.set('X-Robots-Tag', 'noindex');
    next();
  });

  registerRoutes(app, store);

  app.use(express.static(distDir));

  // SPA fallback: serve index.html for any unmatched GET so client routing works.
  // Express 5 requires a named wildcard rather than a bare "*".
  app.get('/*splat', (_req, res) => {
    res.sendFile('index.html', { root: distDir });
  });

  return app;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const config = readStoreConfig(process.env);
  const store = openFirestoreStore(config);
  await assertStoreReachable(store, config);
  createApp(store).listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT}`);
  });
}
