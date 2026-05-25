# Changelog

## 2026-05-25

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
