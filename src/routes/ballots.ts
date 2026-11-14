import express, { type Express } from 'express';
import { checkBallot, standings } from '../shared/ballot.js';
import type { BallotStore } from '../store/store.js';

/**
 * The vote API:
 * - `POST /api/ballots` with `{ "votes": { "<candy id>": <count>, … } }` saves one kid's ballot.
 * - `GET /api/standings` returns how many kids voted and every candy's total, most votes first.
 * - `DELETE /api/ballots` erases every ballot (the standings screen's "Erase all votes").
 */
export function registerBallotRoutes(app: Express, store: BallotStore): void {
  app.post('/api/ballots', express.json({ limit: '4kb' }), async (req, res, next) => {
    try {
      const check = checkBallot((req.body as { votes?: unknown } | undefined)?.votes);
      if (!check.ok) {
        res.status(400).json({ error: check.error });
        return;
      }
      await store.add(check.votes);
      res.status(201).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/standings', async (_req, res, next) => {
    try {
      res.set('Cache-Control', 'no-store');
      res.json(standings(await store.list()));
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/ballots', async (_req, res, next) => {
    try {
      await store.clear();
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });
}
