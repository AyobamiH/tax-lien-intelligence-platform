# Repo Reality KB

## What This File Governs

This file governs repository truth. It describes what exists in the startup repo
today, what is placeholder, and what must not be assumed.

It does not define the full product roadmap. Use the roadmap KB for phase
sequencing and the master product KB for product identity.

## Source-Of-Truth Repo

Primary startup repo:

`OneClickPostFactory/tax-lien-intelligence-platform`

Local primary remote:

`oneclick`

Legacy/personal mirror:

`origin`

The legacy mirror must not be used as product truth. It can exist as backup
history, but future work should be oriented around the startup repo.

## Current Branch Reality

At the time this KB was introduced:

- `main` contains the Phase 1 baseline and CI.
- `feature/repository-discipline-and-auth-foundation` was accepted locally into
  `main` by fast-forward.
- `v0.1-phase1-baseline` marks the verified Phase 1 baseline before auth.

If this file becomes stale, inspect `git branch -a -vv`, `git log --oneline
--decorate --graph --all`, and the startup remote before making assumptions.

## Monorepo Structure

The repo is an npm workspace monorepo:

- `apps/web`: Vite, React, TypeScript, Tailwind.
- `apps/api`: Express, TypeScript.
- `packages/db`: MongoDB connection package.
- `packages/types`: shared types.
- `packages/scoring`: future pure scoring engine package.
- `docs`: architecture, API, decisions, changelog, and this KB.
- `tests`: root-level unit and integration tests.
- `infra/docker`: local MongoDB compose file.
- `scripts/ingestion`: placeholder for future ingestion scripts.

## Current Implemented Systems

Implemented today:

- workspace package structure;
- TypeScript project references;
- root `typecheck`, `test`, and `build` scripts;
- Express app creation;
- API health endpoint at `GET /healthz`;
- auth endpoints at `POST /auth/register`, `POST /auth/login`, and
  `GET /auth/me`;
- user model in `packages/db`;
- password hashing;
- JWT issuance and verification;
- auth middleware that attaches authenticated identity to the request;
- global API error handling;
- structured JSON 404 for unknown API routes;
- environment parsing with `zod`;
- Mongo connection helper using Mongoose;
- frontend shell screen;
- Tailwind setup;
- shared health/error/runtime types;
- local MongoDB docker-compose;
- Vitest unit/integration tests;
- GitHub Actions `quality-gates`;
- local `.githooks/pre-push` quality hook.

## Current Placeholders

Placeholders today:

- `packages/scoring` only exports a version constant.
- `scripts/ingestion` has only a README.
- frontend cards for upload, scoring, and watchlist are not wired workflows.
- CSV dependencies exist, but ingestion does not.
- The frontend has no login/register UI yet even though API auth exists.

## Current Limitations

Not implemented:

- frontend auth screens;
- tenant-owned parcel/dataset/watchlist models;
- parcel/lien schemas;
- CSV upload;
- CSV validation;
- scoring engine;
- scored parcel API;
- watchlist;
- portfolio tracking;
- protected frontend routes;
- production deployment config.

## Workflow Discipline

Current discipline:

- production work should target the startup remote `oneclick`;
- feature work should happen on `feature/*` branches;
- direct non-merge pushes to `main` are blocked by CI soft protection;
- every PR should pass `quality-gates`;
- local contributors should configure `git config core.hooksPath .githooks`;
- the pre-push hook runs install, typecheck, test, and build.

This is soft protection, not GitHub protected-branch enforcement. The workflow
still depends on human discipline.

## CI And Testing Truth

Current CI job:

`quality-gates`

It runs:

- `npm ci`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`.

Current tests cover:

- API health response;
- structured API 404;
- Mongo package disconnected state before startup.
- auth registration;
- duplicate email rejection;
- login;
- invalid credentials;
- malformed JSON;
- missing/malformed/invalid/expired tokens;
- protected `/auth/me`.

Tests do not yet cover:

- cross-user resource isolation beyond the auth identity boundary;
- uploads;
- scoring;
- watchlists;
- security boundaries.

## What Must Not Be Assumed Yet

Do not assume:

- datasets can be uploaded;
- parcels are stored;
- scoring exists;
- watchlists exist;
- user-owned parcel/dataset/watchlist data exists;
- cross-user domain-resource isolation exists beyond auth identity tests;
- portfolio tracking exists;
- frontend shell cards are real workflows.

## Security Notes

The repo has baseline security signals, but it is not yet a hardened SaaS:

- Helmet is enabled.
- JSON body limit is set.
- env parsing exists.
- `.env` is ignored.
- strict TypeScript is enabled.
- password hashing is implemented.
- JWT auth is implemented.
- auth middleware establishes the user identity boundary.
- tenant-owned domain models are not yet implemented.

Security cannot be considered complete until tenant-scoped data models, resource
authorization, upload controls, rate limits, and cross-user resource tests exist.

## Drift Risks

Repo drift risks:

- using the legacy mirror as truth;
- building on `main` without checking accepted feature branches;
- writing docs that claim future systems exist;
- adding backend routes without shared contracts;
- adding frontend pages without real API support;
- letting placeholders harden into architecture accidentally.

## Update Rules

Update this file when:

- repo structure changes;
- packages/apps are added or removed;
- placeholders become implemented systems;
- workflow discipline changes;
- CI or testing expectations change;
- source-of-truth remote assumptions change.
