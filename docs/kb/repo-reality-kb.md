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
- `packages/scoring`: pure scoring engine package.
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
- authenticated dataset endpoints at `POST /datasets`, `GET /datasets`, and
  `GET /datasets/:datasetId`;
- tenant-owned dataset model in `packages/db`;
- manual CSV upload handling;
- safe CSV parsing and validation summary;
- dataset ownership tests;
- internal dataset source row persistence for scoring;
- scored-record model in `packages/db`;
- tenant-owned internal job model in `packages/db`;
- tenant-owned alert model in `packages/db`;
- pure explainable scoring engine in `packages/scoring`;
- dataset row normalization for common parcel/lien CSV headers;
- authenticated scoring endpoints at `POST /datasets/:datasetId/score` and
  `GET /datasets/:datasetId/scores`;
- dataset scoring routed through a persisted `dataset_scoring` job;
- authenticated job detail endpoint at `GET /jobs/:jobId`;
- queued/running/completed/failed job lifecycle;
- safe job summaries and error metadata;
- alert creation from completed/failed dataset scoring jobs;
- authenticated alert endpoints at `GET /alerts`,
  `PATCH /alerts/:alertId/read`, and `PATCH /alerts/read-all`;
- alert ownership tests;
- scored-record ownership tests;
- frontend login/register review surface;
- authenticated dataset list/detail review UI;
- frontend score triggering;
- scored-results table with flags and reasoning detail;
- tenant-owned watchlist item model in `packages/db`;
- authenticated watchlist endpoints at `POST /watchlist`, `GET /watchlist`,
  and `DELETE /watchlist/:watchlistItemId`;
- duplicate-safe watchlist adds;
- watchlist ownership tests;
- frontend keep/remove actions from scored results;
- dedicated watchlist comparison page;
- watchlist detail surface with flags and reasoning;
- tenant-owned portfolio item model in `packages/db`;
- authenticated portfolio endpoints at `POST /portfolio`, `GET /portfolio`,
  `GET /portfolio/:portfolioItemId`, `PATCH /portfolio/:portfolioItemId`, and
  `DELETE /portfolio/:portfolioItemId`;
- portfolio creation from owned scored records or owned watchlist items;
- portfolio status tracking with a small explicit status enum;
- portfolio ownership tests;
- frontend track/untrack actions from scored results;
- watchlist-to-portfolio promotion actions;
- dedicated portfolio status tracking page;
- portfolio detail surface with flags, reasoning, and status controls;
- frontend score-run success message with completed job id/status;
- frontend alerts route with unread count and read/read-all actions;
- structured JSON 404 for unknown API routes;
- environment parsing with `zod`;
- Mongo connection helper using Mongoose;
- frontend review workspace;
- Tailwind setup;
- shared health/error/runtime types;
- local MongoDB docker-compose;
- frontend review-model unit tests;
- Vitest unit/integration tests;
- GitHub Actions `quality-gates`;
- local `.githooks/pre-push` quality hook.

## Current Placeholders

Placeholders today:

- `scripts/ingestion` has only a README.
- The frontend has no dataset upload UI yet even though dataset APIs exist.
- Full county-specific parcel/lien normalization does not exist yet.

## Current Limitations

Not implemented:

- tenant-owned parcel model;
- frontend dataset upload screen;
- browser upload workflow;
- production deployment config.
- email/SMS alert delivery;
- realtime alert delivery;
- external schedulers or background workers.

## Workflow Discipline

Current discipline:

- production work should target the startup remote `oneclick`;
- direct pushes to `main` are allowed after local quality gates pass;
- pull requests may be used for visibility, but are not the current gate;
- GitHub Actions verifies pushes to `main` with `quality-gates`;
- local contributors should configure `git config core.hooksPath .githooks`;
- the pre-push hook runs install, typecheck, test, and build.

This is local-first soft protection, not GitHub protected-branch enforcement. The
workflow depends on contributors not pushing when local checks fail.

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
- dataset upload success and failure cases;
- dataset list/detail ownership boundaries;
- cross-user dataset detail rejection.
- scoring package behavior;
- scoring API ownership boundaries;
- internal job lifecycle success/failure behavior;
- cross-user job detail rejection;
- alert retrieval/read/read-all behavior;
- cross-user alert acknowledgement rejection;
- conservative scoring for partial records.
- frontend review sorting, filtering, formatting, flags, and reasoning helpers.
- watchlist add/list/remove behavior;
- duplicate watchlist handling;
- cross-user watchlist add/delete rejection.
- portfolio add/list/detail/status/delete behavior;
- duplicate portfolio handling;
- cross-user portfolio source/read/update/delete rejection.

Tests do not yet cover:

- cross-user resource isolation for future parcel records;
- final underwriting model;
- security boundaries.

## What Must Not Be Assumed Yet

Do not assume:

- parcels are stored;
- user-owned parcel data exists;
- full ingestion exists beyond dataset metadata, source rows, and first-pass
  scoring;
- browser upload exists.

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
- tenant-owned dataset records are implemented.
- tenant-owned internal job records are implemented for scoring.
- tenant-owned alert records are implemented for safe in-app monitoring.
- CSV upload limits and validation are implemented.
- tenant-owned scored-record and watchlist item records are implemented.
- tenant-owned portfolio item records are implemented.
- tenant-owned parcel records are not yet implemented.

Security cannot be considered complete until browser upload, rate limits, and
additional cross-user resource tests for later resource types exist. The current
job layer is in-process plumbing, and the current alert layer is in-app
visibility only, not hardened external automation or delivery.

## Drift Risks

Repo drift risks:

- using the legacy mirror as truth;
- building on `main` without checking accepted feature branches;
- writing docs that claim future systems exist;
- adding backend routes without shared contracts;
- adding frontend pages without real API support;
- letting placeholders harden into architecture accidentally.
- duplicating scoring logic outside `packages/scoring`;
- describing first-pass scoring as final underwriting.
- describing job plumbing as full automation.
- describing in-app alerts as external notification delivery.

## Update Rules

Update this file when:

- repo structure changes;
- packages/apps are added or removed;
- placeholders become implemented systems;
- workflow discipline changes;
- CI or testing expectations change;
- source-of-truth remote assumptions change.
