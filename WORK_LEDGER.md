# Work Ledger

## 2026-07-06T23:41:35+01:00 - Autonomous repo continuation startup

- Repo path used: `/home/oneclickwebsitedesignfactory/tax-lien-platform`.
- Branch and starting HEAD: `main` at
  `c548b1a6cbb3455a70b89d0e301e22435bfccac9`.
- Remotes inspected: `oneclick` startup remote and `origin` legacy mirror.
- What was inspected: git status, current branch, remotes, last 30 commits,
  root structure, package scripts, workspace package manifests, CI workflow,
  docs index, KB files, route/model/job/test file inventory, app entrypoint,
  frontend entry surface, and project-control files.
- Coding evidence tools used first: `coding_repo_map`,
  `coding_validate_project`, `coding_route_trace`, and `coding_secret_audit`.
- Tool result: repo-map and adapter validation completed; route-trace and
  secret-audit were partial because the project adapter does not enable those
  skills, so direct local read-only inspection was used for routes/docs/tests.
- Changed-state declaration: project docs/control files changed; no source
  runtime code, package install, commit, push, deploy, migration, service
  lifecycle action, production mutation, or secret-file read.
- Verified facts found:
  - repo exists at the expected primary path;
  - working tree started clean on `main`;
  - root scripts include `audit`, `typecheck`, `test`, and `build`;
  - CI runs `npm ci`, `npm run audit`, `npm run typecheck`,
    `npm run test`, and `npm run build`;
  - source includes API routes and tests for phases through outcome review;
  - docs/KB claim Phase 43 outcome review is implemented;
  - required root project-control files were missing.
- Assumptions made: the repo docs and tests are accurate unless contradicted by
  source inspection; production runtime is not verified by static inspection.
- Chosen next tasks and why: create the missing project-control files and update
  narrow stale docs because autonomous continuation needs durable mission,
  acceptance, runbook, and ledger controls before deeper product changes; then
  harden production CORS because the security KB identified reflected
  credentialed CORS as a remaining production gap.
- Files changed: `MISSION.md`, `ACCEPTANCE.md`, `OPENCLAW_RUNBOOK.md`,
  `WORK_LEDGER.md`, `README.md`, `docs/kb/current-surface-kb.md`,
  `.env.example`, `apps/api/src/app.ts`, `apps/api/src/config/env.ts`,
  `tests/integration/health.test.ts`, and `docs/kb/security-hardening-kb.md`.
- Checks run before CORS hardening: `git diff --check` passed;
  `npm run typecheck` passed; `npm run test` passed with 36 files and 255
  tests; `npm run audit` passed with 0 vulnerabilities; `npm run build` passed.
- Checks run after CORS hardening:
  - `git diff --check` passed;
  - `npx vitest run tests/integration/health.test.ts --testTimeout=60000`
    passed with 1 file and 4 tests;
  - `npm run typecheck` passed;
  - `npm run test` passed with 36 files and 257 tests;
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run build` passed.
- Results: project-control files created, README/current-surface docs aligned
  with the Phase 43 repo surface, and production CORS now requires an explicit
  allowlist while dev/test retain local reflected-origin ergonomics.
- Blockers: none.
- Next safe step: add focused tests or implementation for the next remaining
  security gap, likely refresh/request rate limiting or richer audit trails,
  without adding dependencies or deploying until John approves those boundary
  actions.

## 2026-07-07T00:24:49+01:00 - Scoring and refresh request rate limiting

- Repo path used: `/home/oneclickwebsitedesignfactory/tax-lien-platform`.
- Branch and starting HEAD: `main` at
  `c548b1a6cbb3455a70b89d0e301e22435bfccac9`.
- What was inspected: current working tree, prior `WORK_LEDGER.md`, coding
  adapter repo-map evidence, scoring/refresh route, scoring service, existing
  scoring integration tests, security KB rate-limit gap, scoring/internal-job
  architecture docs, and OpenClaw Crabbox wrapper documentation/behavior.
- Coding evidence tools used first: `coding_repo_map` and
  `coding_validate_project`.
- Tool result: adapter validation completed; repo-map warned that the working
  tree has local changes, as expected from the previous run.
- Changed-state declaration: local source, tests, docs, and ledger files
  changed; no package install, commit, push, deploy, migration, service
  lifecycle action, production mutation, permission expansion, or secret-file
  read.
- Verified facts found:
  - prior CORS/control-file changes are still uncommitted;
  - scoring and refresh routes were authenticated and workspace-write scoped;
  - refresh already reused active queued/running jobs but scoring/refresh
    request bursts had no route-level rate limiter;
  - security docs explicitly listed rate limiting as a missing protection;
  - Crabbox wrapper exists at the OpenClaw install path, but no usable Crabbox
    binary is available on PATH or repo-local resolution.
- Assumptions made: an in-process fixed-window limiter is acceptable for the
  current single-process local/runtime posture but is not sufficient for future
  multi-instance deployment.
- Chosen next task and why: add dependency-free authenticated rate limiting to
  expensive scoring and refresh route requests because it closes a documented
  security gap without crossing approval boundaries.
- Files changed:
  - `.env.example`;
  - `ACCEPTANCE.md`;
  - `apps/api/src/app.ts`;
  - `apps/api/src/config/env.ts`;
  - `apps/api/src/middleware/rate-limit.ts`;
  - `apps/api/src/routes/scoring.ts`;
  - `docs/architecture/internal-jobs.md`;
  - `docs/architecture/scoring.md`;
  - `docs/kb/security-hardening-kb.md`;
  - `tests/integration/scoring.test.ts`;
  - `WORK_LEDGER.md`.
- Implementation result:
  - added `SCORING_REQUEST_LIMIT_WINDOW_MS` and
    `SCORING_REQUEST_LIMIT_MAX`;
  - added a reusable fixed-window rate-limit middleware;
  - applied it after auth and workspace write checks to score and refresh
    routes;
  - rate keys include authenticated actor, selected workspace, method, base
    route, and route shape;
  - added tests for `429 rate_limit_exceeded` and independent score/refresh
    limits;
  - updated docs to distinguish current in-process protection from future
    distributed/persisted rate limiting.
- Crabbox result:
  - attempted `node .../openclaw/scripts/crabbox-wrapper.mjs run --help`;
  - wrapper failed basic sanity checks with `version=unknown` and
    `providers=unknown`;
  - `command -v crabbox`, `crabbox --version`, and `crabbox --help` confirm no
    Crabbox binary is available on PATH;
  - no remote Crabbox run occurred.
- Capability gap for coding-agent-skills: add a read-only Crabbox preflight
  evidence command that checks wrapper path, resolved binary, version/help
  sanity, provider availability, and whether a remote proof run is possible
  before a coding agent claims Crabbox-backed verification.
- Checks run:
  - `git diff --check` passed;
  - `npm run typecheck` passed;
  - `npx vitest run tests/integration/scoring.test.ts --testTimeout=60000`
    passed with 1 file and 27 tests;
  - `npm run test` passed with 36 files and 259 tests;
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run build` passed.
- Blockers: Crabbox remote verification is blocked by missing/unusable Crabbox
  binary. Product implementation itself is not blocked.
- Next safe step: prepare a commit packet or continue with another local
  hardening task. Commit, push, Crabbox installation/repair, dependency
  installs, service lifecycle actions, deploys, and migrations remain
  approval-bound.

## 2026-07-07T06:30:00+01:00 - Rate-limit activity audit trail

- Requested task: discover the morning work and implement it end to end.
- Workflow lane: coding/security hardening with local docs and tests.
- Risk classification: safe local code, docs, and tests; no secret reads,
  install, commit, push, deploy, migration, service lifecycle action, or
  Crabbox repair performed.
- Tools used:
  - OpenClaw memory search over recent Tax Lien carry-forward notes;
  - `coding_validate_project`, `coding_repo_map`, `coding_api_contract_audit`,
    and `coding_env_audit`;
  - local `rg`/file inspection and targeted npm verification.
- Fallback reason: `api-contract-audit` and `env-audit` were adapter-limited,
  so narrow local inspection was used for route/activity code.
- Evidence discovered:
  - scoring and refresh route limit blocks happen after auth/workspace checks;
  - successful score/refresh requests already wrote workspace activity;
  - rate-limited attempts returned `429` but were not represented in bounded
    operational history.
- Work completed:
  - added an optional fixed-window limiter `onLimit` hook;
  - recorded `dataset_scoring_rate_limited` and
    `dataset_refresh_rate_limited` data-category activity after authenticated
    workspace-scoped limit blocks;
  - kept metadata bounded to dataset id, request kind, and retry window;
  - updated shared activity types, Mongo enum/schema, workspace activity
    summaries, browser activity routing, API/security docs, and focused tests.
- Crabbox result:
  - rechecked `command -v crabbox`;
  - rechecked the OpenClaw Crabbox wrapper with `run --help`;
  - no `crabbox` binary is available on PATH, and the wrapper still fails
    basic version/help sanity checks with unknown version/providers;
  - no remote Crabbox run occurred.
- Changed-state declaration: local uncommitted code/docs/tests changed.
- Verification:
  - `npm run typecheck` passed;
  - `npx vitest run tests/unit/workspace-activity.test.ts tests/integration/scoring.test.ts --testTimeout=60000`
    passed with 2 files and 29 tests;
  - `git diff --check` passed;
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run test` passed with 36 files and 259 tests;
  - `npm run build` passed.
- Next safe step: prepare a commit packet for review, or continue with a
  bounded local hardening task. Commit, push, Crabbox install/repair,
  dependency installation, deployment, and service lifecycle actions remain
  approval-bound.

## 2026-07-07T07:18:00+01:00 - Rate-limit reset-window verification

- Requested task: continue autonomous work from the existing uncommitted Tax
  Lien Platform state and return a commit-ready report.
- Workflow lane: coding/security verification hardening.
- Risk classification: safe local tests/docs/ledger only; no secret reads,
  install, commit, push, deploy, migration, service lifecycle action, or
  Crabbox repair performed.
- Repo state verified first:
  - `pwd` confirmed `/home/oneclickwebsitedesignfactory/tax-lien-platform`;
  - `git status --short`, `git diff --stat`, and `git diff --name-only`
    confirmed the existing uncommitted CORS/rate-limit/activity patch;
  - key changed source, test, docs, and control files were inspected before
    choosing work.
- Coding evidence tools used first:
  - `coding_validate_project` completed;
  - `coding_repo_map` completed;
  - `coding_route_trace` and `coding_api_contract_audit` were adapter-limited,
    so narrow local inspection was used for route/test details.
- Verified current patch summary:
  - production CORS uses explicit configured origins;
  - scoring and refresh requests use an authenticated workspace-scoped
    fixed-window limiter;
  - rate-limited score/refresh attempts write bounded workspace activity;
  - docs and acceptance files identify distributed rate limiting, browser smoke,
    and Crabbox proof as unverified.
- Decision: current hardening work is coherent, so the next safest valuable
  task was verification hardening rather than new product scope.
- Work completed:
  - added `tests/unit/rate-limit.test.ts`;
  - covered reset-window behavior after the fixed window expires;
  - covered the limiter `onLimit` hook and retry-window context for blocked
    requests;
  - updated `ACCEPTANCE.md` to name the new limiter coverage.
- Changed-state declaration: local uncommitted tests/docs/ledger changed.
- Verification:
  - `npx vitest run tests/unit/rate-limit.test.ts tests/unit/workspace-activity.test.ts tests/integration/scoring.test.ts --testTimeout=60000`
    passed with 3 files and 31 tests;
  - `git diff --check` passed;
  - `npm run typecheck` passed;
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run build` passed;
  - `npm run test` passed with 37 files and 261 tests.
- Crabbox result:
  - `command -v crabbox` returned no binary;
  - the OpenClaw Crabbox wrapper still failed basic version/help sanity checks
    with unknown version/providers;
  - no Crabbox proof was claimed.
- Next safe step: prepare a commit packet for review, or continue with another
  bounded local verification task. Commit, push, Crabbox install/repair,
  deployment, migrations, and service lifecycle actions remain approval-bound.

## 2026-07-07T07:43:00+01:00 - Autonomous hardening verification and commit path

- Requested task: continue as persistent OpenClaw project worker for the Tax
  Lien Intelligence Platform, inspect current repo truth, verify/continue the
  current patch, repair/use Crabbox if locally possible, and commit/push after
  checks pass.
- Repo path used: `/home/oneclickwebsitedesignfactory/tax-lien-platform`;
  fallback typo path `/home/oneclickwebsitefactory/tax-lien-platform` was not
  present.
- Branch and starting HEAD: `main` at
  `c548b1a6cbb3455a70b89d0e301e22435bfccac9`.
- Starting state: local uncommitted edits existed from the CORS/rate-limit/
  activity hardening series and were preserved.
- What was inspected: git status, branch, remotes, latest commits, repo root
  structure, workspace/package structure, scripts, CI workflow, docs, KB files,
  `.env.example`, API entrypoints, scoring route, rate-limit middleware,
  shared activity types, Mongo activity schema, web activity routing, tests,
  project-control files, and current uncommitted diff.
- Coding evidence tools used first:
  - `coding_validate_project` completed;
  - `coding_repo_map` completed and reported local changes;
  - `coding_route_trace`, `coding_api_contract_audit`, `coding_env_audit`,
    and `coding_secret_audit` were adapter-limited and did not read target
    files, so narrow direct inspection was used.
- Verified facts discovered:
  - the uncommitted patch adds explicit production CORS allowlist behavior;
  - score and refresh routes are authenticated and workspace-write scoped
    before the fixed-window limiter runs;
  - limiter keys include actor, selected workspace, method, base URL, and route
    shape;
  - rate-limited score/refresh blocks return structured `429` responses and
    write bounded workspace activity for authenticated workspace requests;
  - focused unit and integration coverage exists for CORS policy, route limit
    response details, independent score/refresh limits, activity events,
    `onLimit`, and reset-window behavior.
- Assumptions made: in-process limiting remains acceptable for current
  single-process local/runtime verification, but is not sufficient for future
  multi-instance deployment.
- Chosen next task and why: no additional product code change was needed; the
  safest valuable task was control-file alignment, final verification, then
  commit/push under the explicit operator authorization in this request.
- Crabbox diagnosis:
  - no `crabbox` binary is on PATH;
  - the only local Crabbox artifact found is the OpenClaw
    `crabbox-wrapper.mjs`;
  - the wrapper fails `--version` and `run --help` sanity checks with unknown
    version/providers;
  - `@openclaw/crabbox-plugin@0.23.0` was inspected via `npm pack` in `/tmp`
    and contains an OpenClaw plugin, not the Crabbox CLI binary;
  - `openclaw skills search crabbox` returned no skills;
  - no repo/workspace-local repair target was found, so no install or repair
    was performed and no Crabbox proof was claimed.
- Changed-state declaration: project-control docs and ledger were updated
  before final verification. No deployment, migration, service lifecycle
  action, production mutation, dependency change, package install, or secret
  read was performed.
- Verification:
  - `git diff --check` passed;
  - `npm run typecheck` passed;
  - `npx vitest run tests/unit/rate-limit.test.ts tests/unit/workspace-activity.test.ts tests/integration/health.test.ts tests/integration/scoring.test.ts --testTimeout=60000`
    passed with 4 files and 35 tests;
  - `npm run test` passed with 37 files and 261 tests;
  - `npm run build` passed;
  - `npm run audit` passed with 0 vulnerabilities.
- Result: final verification passed and the patch is ready for the explicitly
  authorized commit/push step.
- Next safe step: commit and push the verified hardening patch, then continue
  with the next bounded product-roadmap or runtime-smoke task.

## 2026-07-07T07:49:00+01:00 - Commit and push completion record

- Commit created: `72fb06c38d71dcabff82957de07605c37a6495cc`
  (`feat: harden scoring request limits`).
- Push target: tracked upstream `oneclick/main`.
- Push result: succeeded, advancing `oneclick/main` from `c548b1a` to
  `72fb06c`.
- Pre-push hook result:
  - dependency install check reported packages up to date and 0
    vulnerabilities;
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run typecheck` passed;
  - `npm run test` passed with 37 files and 261 tests;
  - `npm run build` passed.
- Post-push state: working tree clean on `main` tracking `oneclick/main`.
- Remaining limits: no Crabbox proof was produced because no Crabbox CLI or
  repo/workspace-local repair target was available; live browser/runtime smoke
  remains the next verification target.
- Next safe step: perform a bounded local runtime/browser smoke or continue the
  next roadmap hardening task. Production deploy, migrations, service lifecycle
  changes, paid/provider Crabbox setup, and production credentials remain
  permission boundaries.

## 2026-07-07T09:20:00+01:00 - Local runtime smoke evidence

- Requested task: continue autonomous Tax Lien project work from the existing
  repo, inspect current truth first, choose the next safest valuable task,
  implement it, verify it, record it, and commit/push if checks pass.
- Repo path used: `/home/oneclickwebsitedesignfactory/tax-lien-platform`;
  fallback typo path `/home/oneclickwebsitefactory/tax-lien-platform` was not
  present.
- Branch and starting HEAD: `main` at
  `da8d581dc4cdcb30a5ad99aebdd14b385ffd4de4`.
- Starting state: clean working tree tracking `oneclick/main`.
- What was inspected: repo path, git status, branch, remotes, recent commits,
  package scripts, project-control files, docs/KB inventory, CI workflow,
  API/web/package/source structure, API startup path, API health route, web app
  shell, API client base URL, and existing runtime/browser-smoke gaps.
- Coding evidence tools used first:
  - `coding_validate_project` completed;
  - `coding_repo_map` completed;
  - `coding_route_trace`, `coding_api_contract_audit`, and
    `coding_env_audit` were adapter-limited, so narrow direct inspection was
    used for route/runtime details.
- Verified facts discovered:
  - the repo already has strong unit/integration/build/audit gates;
  - `ACCEPTANCE.md` still listed live local API and browser runtime behavior as
    unverified;
  - the API process entrypoint requires MongoDB before listening, but
    `createApp()` can be started in-process for health/404 runtime smoke
    without reading secrets or connecting to production services;
  - the built Vite shell can be served from `apps/web/dist` and checked over
    local HTTP without adding browser-driver dependencies.
- Assumptions made: a dependency-free HTTP smoke is valuable as local runtime
  proof, but it is not equivalent to browser-driver screenshots, deployed
  proof, MongoDB-backed end-to-end proof, or Crabbox proof.
- Chosen next task and why: add `npm run smoke:local` because the next recorded
  gap after the committed hardening was bounded local API/browser-shell runtime
  smoke evidence.
- Files changed:
  - `package.json`;
  - `scripts/local-runtime-smoke.mjs`;
  - `README.md`;
  - `ACCEPTANCE.md`;
  - `docs/architecture/frontend-review.md`;
  - `WORK_LEDGER.md`.
- Changed-state declaration: local script/docs/control files changed. No
  deployment, migration, service lifecycle action, production mutation,
  dependency change, package install, or secret read was performed.
- Verification:
  - first `npm run smoke:local` run failed because the new smoke script tried
    to close the Express app object instead of the HTTP server returned by
    `app.listen()`;
  - fixed the smoke script to close the returned HTTP server;
  - `git diff --check` passed;
  - `npm run smoke:local` passed, including build, API `/healthz`, structured
    API 404, built web index, and built JS/CSS asset fetches over local HTTP;
  - `npm run typecheck` passed;
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run build` passed;
  - `npm run test` passed with 37 files and 261 tests.
- Result: local API/web-shell runtime smoke is now repeatable through
  `npm run smoke:local`.
- Next safe step: commit and push the smoke evidence task, then continue with
  either interactive browser-driver proof if a safe tool is available or the
  next roadmap hardening task.
