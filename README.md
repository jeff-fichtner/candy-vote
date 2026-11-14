# candy-vote

The candy vote kids see as **King Size Showdown**: each kid gets 3 votes to give to the king-size
candy bars they like best (all 3 on one candy is allowed), one kid after another on a shared
device. The standings rank every candy by its vote total, so the top few are what to buy.

Vite + React + TypeScript, an Express API, and Firestore for the ballots; deployed to Google
Cloud Run. The voting screen is prerendered.

Everyone who opens the site sees the standings. One device, the owner's phone, can also start and
stop voting, take the kids' votes while voting is open, and erase the votes; the server refuses
those from any other device. The phone becomes the owner device by opening the setup link
`https://<host>/#owner=<OWNER_KEY>` once: the page keeps the key in that browser and removes it
from the address bar. Opening the link in another browser makes that one an owner device too, so
keep the link private; changing `OWNER_KEY` revokes every device that holds the old one.

- `src/shared/candies.ts` is the candy list and the number of votes per kid.
- `src/shared/ballot.ts` checks a ballot and adds up the standings (tied candies share a place).
- API (`src/routes/ballots.ts`): `GET /api/standings` and `GET /api/me` for anyone; `POST /api/voting`,
  `POST /api/ballots` and `DELETE /api/ballots` for the owner device only (`src/owner.ts`).
- The Matilda logo images in `src/web/public/` come from the show's licensed logo pack.

## Develop

This app runs on Node 26 (see `.nvmrc`); confirm `node --version` prints `v26.x`
(`nvm use` switches to it in an interactive shell).

```bash
node --version   # expect v26.x
npm install
npm run dev      # dev server at the URL Vite prints
```

`npm run dev` and `npm test` start the Firestore emulator, which needs gcloud's
`cloud-firestore-emulator` component and Java 25 or later. The local `.env` points the app at the
emulator; its data lasts until `npm run dev` stops.

The local environment is the committed `.env`, which documents every variable. While it holds
only plain config, `npm run dev` needs no `op run` (see [App secrets](#app-secrets)).

## Scripts

```bash
npm run dev          # dev server
npm run build        # build the distribution into dist/
npm run start        # run the built server
npm run lint         # ESLint
npm run format       # Prettier (write)
npm run typecheck    # tsc, frontend + backend
npm test             # Vitest
npm run check:env    # tracked env files hold only declared config and op:// references
npm run check:all    # format check + lint + typecheck + check:env + test
```

## App secrets

Every variable in the committed `.env` is plain config, listed on the file's `# config:` line.
`npm run check:env` (part of `check:all`) fails if a tracked env file holds a raw value for any
other key, so a secret pasted into `.env` never gets past the gate. It names the file, line and
key, never the value.

A secret lives in 1Password: vault `app-secrets`, item `candy-vote.local`, one field named after
the variable. `.env` holds only its reference (`KEY=op://app-secrets/candy-vote.local/KEY`), and
from then on the dev server runs as `op run --env-file=.env -- npm run dev`. Started without
`op run`, the dev and build scripts stop at startup and name the unresolved variable.

Under `op run --env-file`, the file's values win over variables already set in the shell, so
`PORT=8095 op run --env-file=.env -- npm run dev` still uses the file's `PORT`. Put an override
after the `--` instead: `op run --env-file=.env -- env PORT=8095 npm run dev`.

Production never reads an env file. The server does not load `.env` (only the dev and build
scripts do), `.dockerignore` keeps every `.env*` out of the image build, and the image's runtime
stage copies only `dist/`. The Cloud Run service runs on the environment its deploy sets.

## Rendering

Runtime-driven views render on the client. Where content is known at build time, it can be
prerendered to real HTML so those pages ship as markup rather than an empty shell.

Prerendering runs at **build** time, not in dev — so in `npm run dev` the page is the
empty shell (`<div id="root"></div>`) that React mounts into. Run `npm run build` to see
the prerendered markup.

## CI

CI is `.github/workflows/ci-cd.yml`, wired from `CONSUMING.md` in
`jeff-fichtner/snackbyte-release-flow-action`. A pull request runs one job, `validate (merge gate)`,
which branch protection on `main` requires. A push to `main`, the only branch and production, runs
the checks and **derives a version tag from git history** (`vX.Y.Z`). The PATCH is not stored in
`package.json` (which holds only `MAJOR.MINOR`); CI creates and pushes the **tag only**, never a
commit. `environments.json` declares `main` as the one environment; the app's build reads it too.

See [DEPLOY.md](DEPLOY.md) for the full versioning + CI/deploy model.

## Deploy

There is one deploy path: **`cloudbuild.yaml`**, which builds the image and deploys it to Cloud
Run. There is no manual deploy script — a `gcloud run deploy --source .` shortcut would skip the
ingress lock and run under default identities, so the escape hatch is the same Cloud Build run by
hand (the command is in [DEPLOY.md](DEPLOY.md)).

A push to `main` derives a version tag and the chained `deploy` job runs that build: Cloud Run
service `candy-vote` in `snackbyte-apps` (us-central1), runtime identity `candy-vote-runtime`, which
can reach only the Firestore database `candy-vote` and the secret `candy-vote-owner-key` (the
owner key; its copy and the setup link are in 1Password, `app-secrets` → `candy-vote.prod`). The
shared load balancer serves it at `showdown.playhouse395.com` (path matcher `candy-vote-pm`,
certificate `showdown-playhouse395-cert`). To revoke every owner device, add a new version of the
secret and redeploy.

Idle cost is near zero — Cloud Run scales to zero and bills only while handling a request.

## Version

The app reports its version at `/api/version` and (in non-prod) a small on-page chip. The
server endpoint reads `APP_VERSION` / `BUILD_GIT_COMMIT` / `BUILD_DATE` from **runtime
environment variables** — the deploy sets these, so a deployed release reports
its true `vX.Y.Z` / commit / date at `/api/version`. Built and run locally (no deploy
env), it self-reports `0.0.0-dev` / `commit: dev` / `environment: development` — that's
expected, not a bug. (The frontend chip's version comes from `package.json` at build
time; its commit/date are populated only if the build passes them as Docker build-args —
see [DEPLOY.md](DEPLOY.md).)
