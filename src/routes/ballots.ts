import express, { type Express } from 'express';
import { requireOwner, type OwnerCheck } from '../owner.js';
import { checkBallot, standings } from '../shared/ballot.js';
import type { BallotStore } from '../store/store.js';

/**
 * The vote API. Anyone may read; only the owner device may change anything.
 * - `GET /api/standings`: how many kids voted, every candy's total (most votes first), and whether
 *   voting is open.
 * - `GET /api/me`: `{ owner: true }` when the request comes from the owner device.
 * - `POST /api/voting` with `{ "open": true | false }`: starts or stops voting. Owner only.
 * - `POST /api/ballots` with `{ "votes": { "<candy id>": <count>, … } }`: saves one kid's ballot.
 *   Owner only, and only while voting is open.
 * - `DELETE /api/ballots`: erases every ballot. Owner only.
 */
export function registerBallotRoutes(app: Express, store: BallotStore, isOwner: OwnerCheck): void {
  const ownerOnly = requireOwner(isOwner);
  const json = express.json({ limit: '4kb' });

  app.get('/api/standings', async (_req, res, next) => {
    try {
      const [ballots, votingOpen] = await Promise.all([store.list(), store.votingOpen()]);
      res.set('Cache-Control', 'no-store');
      res.json({ ...standings(ballots), votingOpen });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/me', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ owner: isOwner(req) });
  });

  app.post('/api/voting', ownerOnly, json, async (req, res, next) => {
    try {
      const open = (req.body as { open?: unknown } | undefined)?.open;
      if (typeof open !== 'boolean') {
        res.status(400).json({ error: 'open must be true or false' });
        return;
      }
      await store.setVotingOpen(open);
      res.json({ votingOpen: open });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/ballots', ownerOnly, json, async (req, res, next) => {
    try {
      const check = checkBallot((req.body as { votes?: unknown } | undefined)?.votes);
      if (!check.ok) {
        res.status(400).json({ error: check.error });
        return;
      }
      if (!(await store.votingOpen())) {
        res.status(409).json({ error: 'voting is closed' });
        return;
      }
      await store.add(check.votes);
      res.status(201).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/ballots', ownerOnly, async (_req, res, next) => {
    try {
      await store.clear();
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });
}
