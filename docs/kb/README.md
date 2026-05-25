# Knowledge Base Pack

This directory is the durable knowledge base for the Tax Lien Intelligence
Platform. It exists to keep future product work, implementation work, design
work, and security work grounded in what the repository actually contains.

The KB deliberately separates current implementation truth from future product
direction. A future capability may be important, but it must not be described as
implemented until the code, tests, and docs exist in the repo.

## How To Use This KB

Start with these files:

- [master-product-kb.md](master-product-kb.md): product identity, positioning,
  value, principles, non-goals, and long-term direction.
- [repo-reality-kb.md](repo-reality-kb.md): source-of-truth repo facts,
  monorepo shape, implemented systems, placeholders, workflow discipline, and
  current limitations.
- [security-hardening-kb.md](security-hardening-kb.md): current security
  posture, trust boundaries, required next protections, and future hardening
  expectations.

Then use the area-specific files:

- [current-surface-kb.md](current-surface-kb.md): what users can actually see
  and call today.
- [domain-and-tenancy-kb.md](domain-and-tenancy-kb.md): domain concepts,
  user-owned data, and multi-tenant isolation rules.
- [frontend-direction-kb.md](frontend-direction-kb.md): frontend role, page
  direction, operator-grade UI expectations, and design drift controls.
- [backend-direction-kb.md](backend-direction-kb.md): backend role, service
  boundaries, validation philosophy, implementation order, and backend security
  expectations.
- [shared-contract-kb.md](shared-contract-kb.md): shared types, DTO direction,
  response shapes, error contracts, and anti-drift API/UI rules.
- [automation-and-intelligence-kb.md](automation-and-intelligence-kb.md):
  automation direction, manual-first sequencing, and what must wait.
- [roadmap-and-phase-boundaries-kb.md](roadmap-and-phase-boundaries-kb.md):
  phase boundaries, dependency order, and anti-bloat rules.
- [glossary-and-core-concepts-kb.md](glossary-and-core-concepts-kb.md):
  project-specific terms and meanings.

## Product Truth

Product truth is governed first by
[master-product-kb.md](master-product-kb.md). It defines what the product is,
what it is not, and why the system is a decision-support tool rather than a
promise of investment outcomes.

Product truth must stay consistent with repo truth. If an idea is only future
direction, describe it as future direction.

## Repo Truth

Repo truth is governed first by [repo-reality-kb.md](repo-reality-kb.md). It
records the current implementation state:

- Phase 1 monorepo baseline exists.
- API health endpoint exists.
- Auth API exists.
- Dataset API exists.
- Scoring API exists.
- Internal job API exists.
- frontend scored-results review surface exists.
- watchlist API and review surface exist.
- portfolio API and status tracking surface exist.
- Mongo connection package exists.
- user model exists.
- dataset model exists.
- scored-record model exists.
- internal job model exists.
- watchlist item model exists.
- portfolio item model exists.
- shared types exist.
- scoring package is a real first-pass deterministic engine.
- full parcel models, browser upload, and automation are not implemented yet.

Do not use the legacy personal mirror as product truth. The primary startup
remote is `oneclick`.

## Security Truth

Security truth is governed first by
[security-hardening-kb.md](security-hardening-kb.md). Security is part of the
product architecture because this SaaS will handle user-uploaded datasets,
investment decision records, authentication, and tenant-owned data.

The current repo has baseline controls such as strict TypeScript, environment
validation, Helmet, a JSON body limit, ignored local env files, quality gates,
password hashing, JWT auth, auth middleware, safe auth error handling,
tenant-owned dataset records, upload size limits, CSV validation, and
authenticated score review. It now also has tenant-owned watchlist items and
cross-user watchlist tests. It now also has tenant-owned portfolio items and
cross-user portfolio tests. It now has tenant-owned internal job records for
scoring and cross-user job tests. It does not yet have standalone parcel models,
rate limiting, external automation, or full cross-user tests for future resource
types because those workflows do not exist yet.

## How Future Contributors Should Update The KB

Update the KB when a feature changes product truth, repo truth, security truth,
or phase boundaries.

Every meaningful feature should update:

- the most relevant KB file;
- `docs/changelog.md`;
- API docs if endpoints changed;
- architecture docs if boundaries changed;
- security docs if data, auth, permissions, uploads, or external inputs changed.

Use these labels consistently:

- `Current implementation`: code exists, tests/docs should exist.
- `Current limitation`: repo does not support it yet.
- `Future direction`: intended later capability.
- `Do not assume`: common drift trap.

## How To Avoid Drift

Before writing specs or code:

1. Read the relevant KB file.
2. Check the current repo files.
3. Verify whether the capability exists or is only planned.
4. Keep changes within the current phase boundary unless explicitly approved.
5. Add tests and docs with every real feature.

Never describe a future route, model, page, or workflow as current unless it is
implemented in the repo.

## How Codex Should Use This KB

For future Codex sessions:

- Use this KB as orientation, not as a substitute for reading the current files.
- Prefer `repo-reality-kb.md` when deciding what exists.
- Prefer `security-hardening-kb.md` when touching auth, uploads, tenancy,
  secrets, logging, or API boundaries.
- Prefer `roadmap-and-phase-boundaries-kb.md` when deciding whether a feature is
  in scope now.
- If the repo and KB disagree, inspect the repo and update the KB as part of the
  same feature.
- For this repo, direct pushes to `oneclick/main` are allowed after local gates
  and the pre-push hook pass. PRs are optional visibility tools, not the current
  gate.
