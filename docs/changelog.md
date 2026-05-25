# Changelog

## 2026-05-25

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
