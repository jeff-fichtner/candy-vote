import type { Express } from 'express';
import type { BallotStore } from '../store/store.js';
import { registerBallotRoutes } from './ballots.js';
import { health } from './health.js';
import { getVersion } from './version.js';

/** Mounts the app's API routes. */
export function registerRoutes(app: Express, store: BallotStore): void {
  app.get('/api/health', health);
  app.get('/api/version', getVersion);
  registerBallotRoutes(app, store);
}
