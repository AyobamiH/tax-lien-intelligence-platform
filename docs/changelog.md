# Changelog

## 2026-06-01

- Implemented Phase 17 browser upload workflow with an authenticated dataset
  upload form, multipart API client integration, upload submitting/success/error
  states, import summary visibility, county-adapter/fallback messaging, and
  tests for upload API behavior and import presentation.
- Updated frontend/dataset/API/KB docs to mark browser upload as current while
  keeping batch upload, live county sync, scraping, ML/AI import
  classification, collaboration, and auction execution out of scope.
- Implemented Phase 16 county-specific import adapter foundation with an
  explicit county adapter interface, a Maricopa-style tax lien CSV adapter,
  safe generic fallback, dataset import summaries, frontend import context
  visibility, and tests for match/fallback/partial mapping/scoring readiness.
- Updated dataset/import/API/architecture/KB docs to mark one county-specific
  import path as current while keeping broad county coverage, live county sync,
  scraping, provider sprawl, ML/AI import classification, collaboration, and
  auction execution out of scope.
- Implemented Phase 15 scheduled maintenance foundation with a
  `dataset_maintenance` job type, stale scored-record scanning, explicit
  manual-only versus policy auto-refresh gating, scheduler-driven maintenance
  task registration, policy-created `requestKind: "policy_refresh"` scoring
  jobs, maintenance status visibility, and duplicate/failure suppression tests.
- Updated job/scoring/worker/API/KB docs to mark scheduled maintenance
  groundwork as current while keeping unlimited autonomous refresh, provider
  sprawl, external scheduler products, ML/AI, delivery channels, collaboration,
  and auction execution out of scope.
- Implemented Phase 14 controlled refresh workflow with authenticated
  dataset refresh requests, duplicate-safe active job reuse, scoring status
  visibility, refresh-aware job metadata, frontend refresh controls, safe
  refresh alerts, and refresh ownership/failure tests.
- Updated scoring/jobs/enrichment/frontend/KB docs to mark manual
  refresh/reprocessing as current while keeping autonomous recurring refresh,
  provider sprawl, ML/AI, collaboration, auction execution, and broad external
  sync out of scope.
- Implemented Phase 13 enrichment orchestration foundation with explicit
  adapter outcomes, deliberate disabled/provider fallback records, freshness and
  reprocess-after metadata, reprocessing-ready scoring job summaries, frontend
  enrichment state visibility, and orchestration/fallback tests.
- Updated enrichment/API/KB docs to mark orchestration, fallback behavior, and
  recency-aware reprocessing readiness as current while keeping provider
  sprawl, ML/AI, collaboration, auction execution, and broad scheduled sync out
  of scope.

## 2026-05-25

- Implemented Phase 12 first external enrichment integration with a controlled
  U.S. Census Geocoder adapter, secure opt-in configuration, timeout and
  per-job row limits, safe external result persistence, worker-scoring
  integration, frontend detail visibility, and external enrichment tests.
- Updated enrichment/API/KB docs to mark one external enrichment path as
  current while keeping provider sprawl, paid integrations, ML/AI,
  collaboration, and auction execution as future work.
- Implemented Phase 11 enrichment adapter foundation with an enrichment service,
  source-field inference adapter, persisted scored-record enrichment metadata,
  enrichment-aware worker scoring, frontend enrichment/detail visibility, and
  enrichment tests.
- Added enrichment architecture documentation and updated API/KB docs to mark
  internal source-data enrichment as current for Phase 11 while keeping
  external enrichment providers, geocoding, ML/AI, collaboration, and auction
  execution out of that phase.
- Implemented Phase 10 worker and scheduler foundation with a dedicated API
  worker entrypoint, queued-job claiming, worker-driven dataset scoring,
  minimal scheduler module, frontend job-status polling, and worker/scheduler
  tests.
- Added worker and scheduler architecture documentation and updated API/KB docs
  to mark background execution groundwork as current while keeping external
  schedulers, third-party queues, enrichment adapters, delivery channels, ML/AI,
  collaboration, and auction execution as future work.
- Implemented Phase 9 alerts and monitoring foundation with tenant-owned alert
  records, authenticated alert list/read/read-all endpoints, scoring job
  completion/failure alert creation, a frontend alerts surface with unread
  state, and alert ownership tests.
- Added alerts API and architecture documentation and updated the KB pack to
  mark in-app alerts as current while keeping email/SMS delivery, realtime
  websockets, external schedulers, background workers, and ML/AI as future work.
- Implemented Phase 8 automation-ready job plumbing with a tenant-owned
  internal job model, queued/running/completed/failed lifecycle, job service,
  authenticated job detail route, dataset scoring job execution, safe job
  summaries/errors, frontend scoring job visibility, and job lifecycle tests.
- Added internal job API and architecture documentation and updated the KB pack
  to mark automation-ready plumbing as current while keeping external
  automation, schedulers, alerts, ML/AI, and auction execution as future work.
- Implemented Phase 7 portfolio tracking with tenant-owned portfolio items,
  authenticated add/list/detail/status/delete endpoints, promotion from scored
  records or watchlist items, cross-user portfolio protections, frontend track
  actions, a dedicated portfolio status surface, and portfolio tests.
- Added portfolio API and architecture documentation and updated the KB pack to
  mark portfolio/status tracking as current product surface while keeping
  automation, alerts, collaboration, auction execution, and ML as future work.
- Implemented Phase 6 watchlist workflow with tenant-owned watchlist items,
  authenticated add/list/remove endpoints, duplicate-safe adds, cross-user
  watchlist protections, frontend keep/remove actions from scored results, a
  dedicated watchlist comparison surface, and watchlist tests.
- Added watchlist API and architecture documentation and updated the KB pack to
  mark watchlist as current product surface while keeping portfolio, automation,
  alerts, collaboration, and ML as future work.
- Implemented Phase 5 frontend scored-results review surface with browser
  login/register, authenticated dataset list/detail views, score triggering,
  a dense scored-record table, row detail reasoning, flags, loading/empty/error
  states, and review-model unit tests.
- Added frontend review surface architecture documentation and updated the KB
  pack to mark score review as current visible product surface while keeping
  watchlists, portfolio, automation, and ML as future work.
- Implemented Phase 4 scoring foundation with a real pure scoring package,
  dataset row normalization, scored-record persistence, authenticated scoring
  routes, explainable score outputs, risk flags, confidence scoring, and
  tenant-scoped scoring tests.
- Added scoring API and architecture documentation and updated the KB pack to
  mark first-pass explainable scoring as current implementation truth while
  keeping frontend scoring UI, watchlists, portfolio, automation, and final
  underwriting as future direction.
- Implemented Phase 3 dataset foundation with authenticated CSV upload,
  tenant-owned dataset records, safe CSV parsing, dataset list/detail endpoints,
  and dataset ownership tests.
- Added `multer` as the minimal multipart upload middleware for manual CSV
  uploads.
- Added dataset API and architecture documentation and updated KB files to mark
  dataset foundation as current implementation truth.
- Aligned repository workflow policy with the current direct-to-`main` operating
  model after local quality gates and pre-push checks pass.
- Removed the CI step that intentionally failed direct pushes to `main` while
  keeping CI quality gates intact.
- Implemented Phase 2 authentication foundation with user model, registration,
  login, JWT issuance, auth middleware, protected `/auth/me`, request
  validation, and global API error handling.
- Added auth integration tests for successful flows, duplicate emails, invalid
  credentials, invalid payloads, malformed JSON, missing tokens, malformed auth
  headers, invalid tokens, and expired tokens.
- Added auth API and architecture documentation.
- Updated the KB pack to mark auth as current implementation truth while keeping
  ingestion, scoring, watchlists, portfolio, and automation as future direction.
- Accepted `feature/repository-discipline-and-auth-foundation` into local
  `main` by fast-forward.
- Added a full repo-grounded KB pack under `docs/kb/`.
- Added `docs/kb/security-hardening-kb.md` to make security posture, trust
  boundaries, tenant isolation, and future hardening requirements first-class
  architecture knowledge.
- Added `docs/README.md` as a top-level documentation index.

## 2026-05-24

- Added local pre-push quality gate hook.
- Updated CI to run on feature branches and fail direct pushes to `main`.
- Reconfigured repository workflow around `oneclick` as the primary remote and
  `origin` as the backup mirror.
- Added CI quality gate workflow and repository workflow documentation.
- Tagged the verified Phase 1 baseline as `v0.1-phase1-baseline`.
- Documented branch protection as blocked until the private repository is on an
  eligible GitHub plan or organization.
- Created Phase 1 monorepo baseline.
- Added Express API with `/healthz`.
- Added React/Vite/Tailwind frontend shell.
- Added MongoDB connection package.
- Added shared types package and scoring package placeholder.
- Added local MongoDB docker-compose configuration.
- Added Phase 1 unit and integration tests.
