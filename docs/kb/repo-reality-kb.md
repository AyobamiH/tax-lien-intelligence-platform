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
- county import adapter boundary in `apps/api/src/datasets/import-adapters.ts`;
- first Maricopa-style tax lien CSV adapter with generic CSV fallback;
- safe dataset import summary metadata for matched and fallback imports;
- dataset readiness summary with field coverage, issues, score, recommendation,
  and guidance;
- dataset-specific manual mapping summary for critical-field import repair;
- authenticated manual mapping context/save endpoints;
- tenant-owned import profile model for reusable mapping rules;
- authenticated import profile list/save/apply endpoints;
- deterministic import profile matching during upload with conservative
  auto-apply/suggest behavior;
- dataset ownership tests;
- internal dataset source row persistence for scoring;
- scored-record model in `packages/db`;
- tenant-owned internal job model in `packages/db`;
- tenant-owned alert model in `packages/db`;
- pure explainable scoring engine in `packages/scoring`;
- dataset row normalization for common parcel/lien CSV headers;
- enrichment service and adapter boundary in `apps/api/src/enrichment`;
- `source_field_inference` adapter for uploaded-row enrichment;
- `census_geocoder` external adapter for opt-in U.S. Census Geocoder address
  normalization/location context;
- enrichment orchestration records adapter outcomes, fallback states, freshness,
  and reprocess-after metadata;
- persisted enrichment metadata on scored records;
- authenticated scoring endpoints at `POST /datasets/:datasetId/score` and
  `POST /datasets/:datasetId/refresh`, `GET /datasets/:datasetId/scoring-status`,
  and `GET /datasets/:datasetId/scores`;
- dataset scoring routed through a persisted `dataset_scoring` job;
- refresh requests use `requestKind: "refresh"` and reuse active queued/running
  dataset jobs instead of duplicating work;
- scheduled maintenance uses `dataset_maintenance` jobs with
  `requestKind: "maintenance_scan"` to inspect stale dataset scoring state;
- policy-created refresh jobs use `requestKind: "policy_refresh"` and remain
  distinguishable from manual refresh requests;
- maintenance policy defaults to manual-only and only queues policy refreshes
  when explicit server policy and duplicate/suppression guards allow it;
- authenticated job detail endpoint at `GET /jobs/:jobId`;
- queued/running/completed/failed job lifecycle;
- dedicated worker entrypoint for queued internal jobs;
- worker-side job claiming and dataset scoring execution;
- minimal internal scheduler module for local timed task registration and
  bounded stale dataset maintenance scans;
- safe job summaries and error metadata;
- alert creation from completed/failed dataset scoring jobs;
- authenticated alert endpoints at `GET /alerts`,
  `PATCH /alerts/:alertId/read`, and `PATCH /alerts/read-all`;
- alert ownership tests;
- scored-record ownership tests;
- enrichment adapter and enrichment-aware scoring tests;
- frontend login/register review surface;
- frontend browser CSV upload form for authenticated dataset creation;
- frontend upload submitting/success/error state;
- frontend import summary visibility immediately after upload;
- frontend import readiness status and issue visibility after upload and on
  dataset detail;
- frontend manual mapping repair panel for not-ready datasets;
- frontend import profile save/apply visibility on dataset detail;
- authenticated dataset list/detail review UI;
- frontend score triggering;
- frontend controlled refresh action and scoring freshness/status display;
- scored-results table with flags and reasoning detail;
- frontend record detail enrichment/data-quality visibility;
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
  `GET /portfolio/summary`, `GET /portfolio/:portfolioItemId`,
  `PATCH /portfolio/:portfolioItemId`, and `DELETE /portfolio/:portfolioItemId`;
- portfolio creation from owned scored records or owned watchlist items;
- portfolio status tracking with a small explicit status enum;
- tenant-scoped portfolio summary with status distribution, recent additions,
  recent status changes, and conservative needs-attention signals;
- portfolio ownership tests;
- frontend track/untrack actions from scored results;
- watchlist-to-portfolio promotion actions;
- dedicated portfolio dashboard/status tracking page;
- frontend portfolio status distribution, recent activity, needs-attention
  review, and status filtering;
- portfolio detail surface with flags, reasoning, and status controls;
- tenant-owned saved view model in `packages/db`;
- authenticated saved-view endpoints at `POST /saved-views`,
  `GET /saved-views`, `GET /saved-views/:savedViewId/apply`,
  `PATCH /saved-views/:savedViewId`, and
  `DELETE /saved-views/:savedViewId`;
- saved portfolio/comparison criteria validation with built-in attention
  queues;
- frontend portfolio saved-view save/apply/default flow;
- tenant-owned comparison item model in `packages/db`;
- tenant-owned decision history model in `packages/db`;
- authenticated comparison endpoints at `POST /comparison`, `GET /comparison`,
  `PATCH /comparison/:comparisonItemId`, and
  `DELETE /comparison/:comparisonItemId`;
- authenticated comparison history endpoint at
  `GET /comparison/:comparisonItemId/history`;
- authenticated comparison handoff endpoints at
  `POST /comparison/:comparisonItemId/handoff/watchlist` and
  `POST /comparison/:comparisonItemId/handoff/portfolio`;
- comparison creation from owned scored records, watchlist items, or portfolio
  items;
- duplicate-safe comparison adds;
- bounded lightweight decision notes;
- server-recorded decision/note change history with bounded note snapshots and
  safe derived metadata;
- explicit duplicate-safe comparison-to-watchlist and comparison-to-portfolio
  handoff actions;
- server-recorded handoff history with safe target linkage metadata;
- comparison ownership tests;
- decision history ownership/stale-item tests;
- decision handoff ownership/duplicate/stale-reference tests;
- compare actions from scored review, watchlist, and portfolio surfaces;
- dedicated side-by-side comparison workspace;
- comparison detail surface with decision state, note editing, flags, and
  reasoning;
- comparison detail history surface for recent decision/note changes;
- comparison detail handoff actions with destination result visibility;
- frontend score job status polling after a scoring trigger;
- frontend alerts route with unread count and read/read-all actions;
- structured JSON 404 for unknown API routes;
- environment parsing with `zod`;
- Mongo connection helper using Mongoose;
- frontend review workspace;
- Tailwind setup;
- shared health/error/runtime types;
- local MongoDB docker-compose;
- frontend upload API client tests;
- frontend review-model unit tests;
- Vitest unit/integration tests;
- GitHub Actions `quality-gates`;
- local `.githooks/pre-push` quality hook.

## Current Placeholders

Placeholders today:

- `scripts/ingestion` has only a README.
- Broad county-specific parcel/lien normalization does not exist yet.
- Only one county import adapter exists, and it targets Maricopa-style CSVs.
- Focused manual mapping exists for critical fields only; no full spreadsheet
  editor or row-by-row repair system exists.
- Reusable import profiles exist for tenant-owned deterministic mapping reuse;
  no global/shared profile catalog, rule-builder UI, or ML mapping suggestion
  system exists.
- Broad external enrichment provider coverage does not exist yet.
- Unlimited autonomous refresh does not exist yet.
- User-facing scheduler configuration does not exist yet.

## Current Limitations

Not implemented:

- tenant-owned parcel model;
- broad county adapter coverage.
- broad import profile sharing or marketplace behavior.
- live county sync or scraping.
- production deployment config.
- email/SMS alert delivery;
- realtime alert delivery;
- external schedulers, worker fleets, or third-party queues.
- broad cron-based refresh or external sync automation.
- provider-sprawl refresh policies.

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
- queued job claiming behavior;
- worker-driven scoring success/failure behavior;
- stale job target failure handling;
- scheduled maintenance policy evaluation, stale dataset scan, duplicate
  suppression, manual-only decisions, policy refresh creation, and recent
  failure suppression;
- county import adapter match, fallback, partial-file, and non-match behavior;
- dataset readiness status, field coverage, warning/blocking issue behavior,
  and frontend readiness presentation;
- Maricopa-style import mapping into scoreable normalized fields;
- scheduler task registration, due execution, and failure behavior;
- cross-user job detail rejection;
- alert retrieval/read/read-all behavior;
- cross-user alert acknowledgement rejection;
- conservative scoring for partial records.
- frontend review sorting, filtering, formatting, flags, and reasoning helpers.
- watchlist add/list/remove behavior;
- duplicate watchlist handling;
- cross-user watchlist add/delete rejection.
- portfolio add/list/detail/status/delete behavior;
- portfolio summary status distribution, recent activity, empty summary, and
  ownership-safe aggregation behavior;
- duplicate portfolio handling;
- cross-user portfolio source/read/update/delete rejection.
- saved-view create/list/apply behavior;
- invalid saved-view criteria rejection;
- built-in attention queue behavior;
- cross-user saved-view apply rejection.
- comparison add/list/update/delete behavior;
- duplicate comparison handling;
- cross-user comparison source/update/delete/history/handoff rejection.

Tests do not yet cover:

- cross-user resource isolation for future parcel records;
- final underwriting model;
- security boundaries;
- external enrichment provider behavior beyond the current Census Geocoder
  adapter.

## What Must Not Be Assumed Yet

Do not assume:

- parcels are stored;
- user-owned parcel data exists;
- full ingestion exists beyond dataset metadata, source rows, and first-pass
  scoring;
- the Maricopa-style adapter means broad county support exists;
- source labels or filenames prove county identity;
- browser upload supports batch imports or live county sync;
- readiness summaries mean a dataset was manually remapped or corrected;
- manual mapping means source rows were overwritten.
- import profiles are shared across users or applied through ML.

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
- CSV upload limits and validation are implemented, and the browser upload flow
  uses that existing backend boundary.
- county import adapter detection uses explicit header evidence and returns
  safe summary metadata rather than raw source rows.
- import readiness summaries are backend-computed and expose safe coverage,
  issue, and guidance metadata rather than raw rows or parser internals.
- manual mappings are tenant-owned dataset metadata and are applied as a
  derived overlay rather than source-row mutation.
- import profiles are tenant-owned mapping configuration and are applied only
  through deterministic owner-scoped matching or explicit user confirmation.
- tenant-owned scored-record and watchlist item records are implemented.
- tenant-owned portfolio item records are implemented.
- tenant-owned portfolio summary aggregation is implemented over owned
  portfolio records only.
- tenant-owned saved views are implemented and applied only over owned
  portfolio/comparison records.
- tenant-owned comparison item records are implemented.
- tenant-owned parcel records are not yet implemented.

Security cannot be considered complete until rate limits, production CORS
decisions, browser session hardening, and additional cross-user resource tests
for later resource types exist. The current worker layer is a local background
execution boundary, not hardened external automation, distributed queueing, or
delivery infrastructure. The current alert layer is in-app visibility only.

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
- describing worker plumbing as full automation.
- describing in-app alerts as external notification delivery.
- describing portfolio summaries as accounting, return analytics, BI reporting,
  or predictive financial insight.
- describing import readiness as manual field mapping, broad county support, or
  proof that scoring quality is final.
- describing focused manual mapping as a full spreadsheet editor or county
  import automation.
- describing import profiles as a broad ETL product, shared marketplace, or
  ML-based import classifier.

## Update Rules

Update this file when:

- repo structure changes;
- packages/apps are added or removed;
- placeholders become implemented systems;
- workflow discipline changes;
- CI or testing expectations change;
- source-of-truth remote assumptions change.
