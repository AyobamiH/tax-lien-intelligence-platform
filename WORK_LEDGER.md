# Work Ledger

## 2026-08-29T14:00:00Z - P47-060 data inventory closure

- Published implementation checkpoint: `9cbc841` on
  `feature/intelligence-engine-foundation`.
- Remote verification: GitHub Actions run `33248227529`, quality-gates job
  `99089286887`, completed successfully.
- Remote steps passed: MongoDB container initialization, dependency install,
  graph validation, data-source inventory validation, audit, typecheck, full
  tests, build, real-process intelligence-service smoke, and real MongoDB
  intelligence-persistence smoke.
- Node result: `P47-060-data-inventory` is complete with six source classes,
  zero external sources approved for production or model training, and a
  blocked redemption training dataset card with exact unblocking conditions.
- Graph result:
  - `P47-065-lawful-data-acquisition` is ready to create the commercial-purpose
    request, terms, lifecycle schema, artifact manifest, privacy controls, and
    time-aware entity-resolution evidence required before model training;
  - `P47-090-chatgpt-interface` is ready to deliver a read-only, tenant-safe
    evidence surface without waiting for model availability.
- Explicit limits remain: no county authorization, historical redemption
  corpus, trained model, calibrated probability, production deployment, or
  ChatGPT tool surface is claimed.

## 2026-08-29T13:45:00Z - P47-060 data inventory implementation checkpoint

- Starting point: remote feature branch
  `feature/intelligence-engine-foundation` at `fe24dc1`, with the platform
  integration closed and current uploads retaining unknown jurisdiction.
- Chosen node: `P47-060-data-inventory`, now `in_progress` pending publication
  and remote CI.
- Source research completed:
  - traced the official county GIS directory to the Lien and Delinquent Parcels
    ArcGIS experience, web map, feature service, and relevant layers;
  - verified the GIS terms require written authorization for external use and
    prohibit commercial intent, resale, or distribution except under an
    agreement;
  - downloaded the real 2026-08-17 Assessor Secured Master archive, checked its
    checksum, inspected its bundled specification, and sampled the 39-field
    header;
  - verified the Assessor item declares twice-monthly updates and the bundled
    specification limits the data to the current tax year;
  - verified the Assessor schema contains property, deed, sale, and valuation
    features but no certificate identity, lien sale date, redemption event,
    terminal event, or observed-through field;
  - traced the official county payment link to the Treasurer domain and
    recorded Tax Lien Web as an authenticated certificate-holder surface whose
    schema, export contract, history, and permitted commercial uses remain
    unknown;
  - reviewed the Realauction publisher surface without treating it as a
    verified county data contract or redemption outcome source.
- Work completed:
  - added `docs/engine/data-source-inventory.json` with six sources, authority,
    access, schema, cadence, history, observation time, terms, outcome labels,
    personal-data controls, provenance, production decision, and exact
    unblocking conditions;
  - added `scripts/validate-data-source-inventory.mjs` and
    `npm run validate:data-inventory`;
  - wired the inventory gate into CI;
  - added the human-readable source analysis and blocked training dataset card;
  - added `P47-065-lawful-data-acquisition` so records requests, written terms,
    source manifests, privacy, and time-safe entity resolution are completed
    before model training;
  - allowed the read-only ChatGPT evidence node to proceed after source
    inventory because stored evidence and explicit abstention do not depend on
    trained model promotion.
- Product-truth result: zero external sources are approved for production or
  model training. `P47-070-trained-models` remains blocked. No source was
  scraped into the product, no dataset or model was created, and no probability
  was fabricated.
- Changed-state declaration: governance script, CI, graph, and documentation
  only. A public Assessor artifact was downloaded to a temporary research path
  for schema inspection and was not copied into the repository. No dependency,
  deployment, migration, secret, credential, production service, or production
  data was changed.
- Local verification:
  - `npm run validate:data-inventory` passed with 6 sources, 0 approved, 4
    blocked, and training blocked;
  - `npm run validate:work-graph` passed with 11 nodes and one in progress;
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run typecheck` passed;
  - `npm run test` passed with 10 Python tests and 306 Vitest tests across 46
    files;
  - `npm run build` passed for all workspaces and Python compile;
  - `git diff --check` passed.
- Remaining completion proof: run repository-wide gates, publish the
  implementation checkpoint, verify branch CI, then publish a graph and ledger
  closure commit.

## 2026-08-29T12:45:00Z - P47-050 platform-integration closure

- Published implementation checkpoint: `eefcf3a` on
  `feature/intelligence-engine-foundation`.
- Remote verification: GitHub Actions run `33247151199`, quality-gates job
  `99086489141`, completed successfully.
- Remote steps passed: MongoDB container initialization, dependency install,
  graph validation, audit, typecheck, full tests, build, real-process service
  smoke, and real MongoDB intelligence-persistence smoke.
- Persistence proof: the built Mongo store wrote and read a contract-valid
  versioned result, revalidated its evidence digest, replaced it with an
  explicit service failure, and proved the prior result was absent from both
  mapped and raw stored state.
- Node result: `P47-050-platform-integration` is complete. Current user uploads
  retain unknown jurisdiction and truthfully return `out_of_scope`; no header
  pattern or user label is promoted into verified county authority.
- Next ready node: `P47-060-data-inventory`, which must verify source authority,
  licensing, cadence, fields, historical coverage, and outcome labels before
  any upload or feed can receive exact jurisdiction scope.
- Explicit limits remain: no production deployment, no current county auction
  feed, no trained model, no calibrated probability, and no ChatGPT tool
  surface are claimed.

## 2026-08-29T12:30:00Z - P47-050 platform-integration implementation checkpoint

- Starting point: remote feature branch
  `feature/intelligence-engine-foundation` at `cb56e52`, with the authenticated
  Python service checkpoint published and all earlier Phase 47 dependencies
  complete.
- Chosen node: `P47-050-platform-integration`, now `in_progress` pending remote
  CI and real MongoDB smoke proof.
- Work completed:
  - added a tenant-side TypeScript service client with explicit disabled,
    rejected, unavailable, and invalid-response outcomes;
  - validated contract shape, request ID, candidate ID, evidence version, and
    recomputed evidence digest before accepting service output;
  - added contract `1.1.0` `user_upload` provenance without treating uploaded
    rows as official county records;
  - built versioned evidence per scored row and kept upload jurisdiction
    unknown because an adapter header match is not proof of issuing authority;
  - added bounded service concurrency, default 8 and capped at 32;
  - persisted complete versioned results or explicit no-result abstention
    envelopes and removed prior results during failed replacement runs;
  - added job-summary counts for completed, not-configured, and failed
    intelligence evaluations;
  - kept existing numerical score fields for compatibility while adding
    `legacyScoring` metadata and browser labels that identify the redemption
    value as a fixed-rule heuristic signal;
  - added browser detail for engine status, versions, applicability, signals,
    findings, missing evidence, disabled state, and failure state;
  - added a real MongoDB CI service and bounded persistence smoke that writes,
    reads, validates, replaces, and removes stale result state.
- Product-truth result: the platform can consume and store the real service's
  deterministic result, but it still does not claim a redemption probability,
  AVM, liquidity model, current county auction feed, or production deployment.
- Changed-state declaration: application source, contracts, tests, CI, config
  examples, and documentation only. No deployment, migration, service restart,
  secret read, production traffic, or production data mutation occurred.
- Local verification:
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run validate:work-graph` passed with 10 nodes and one in progress;
  - `npm run typecheck` passed;
  - `npm run test` passed with 10 Python tests and 306 Vitest tests across 46
    files;
  - `npm run build` passed for all workspaces and Python compile;
  - `npm run smoke:local` passed;
  - `npm run smoke:browser` passed with 3 files and 6 tests;
  - `npm run smoke:intelligence-service` passed with 9 real-process tests;
  - `git diff --check` passed.
- Remaining completion proof: push this implementation checkpoint, verify the
  branch CI run including `npm run smoke:intelligence:mongo`, then publish a
  small graph and ledger closure commit. The local workspace has no MongoDB
  daemon, so no local Mongo-backed success is claimed.

## 2026-08-29T04:50:00Z - Phase 47 graph-governed operating foundation

- Starting point: remote feature branch
  `feature/intelligence-engine-foundation` at `ba1b0cb`, with the baseline
  maintenance-selection repair and clean dependency audit published.
- Chosen node: `P47-010-governance`.
- Work completed:
  - added the Phase 47 machine-readable directed acyclic work graph;
  - added a dependency, state, ownership, evidence, and cycle validator;
  - wired graph validation into root scripts and CI;
  - extended `AGENTS.md` and acceptance rules with graph-first work selection,
    handoff, documentation, verification, commit, and push requirements;
  - documented the engine boundary, open-source reuse choices, Phase 47 plan,
    repository authority limit, current status, and no-mock intelligence rule.
- Agent-operating result: agents can select unblocked nodes without rebuilding
  project history, and handoffs have a fixed evidence structure.
- Product-truth result: unsupported evidence must abstain; the rules prototype
  cannot be described as a calibrated probability model; ChatGPT remains an
  evidence interface rather than the numerical engine.
- Changed-state declaration: governance scripts, CI, docs, graph, acceptance,
  changelog, and ledger only. No production endpoint, model output, deployment,
  migration, secret read, or production mutation.
- Verification:
  - `npm run validate:work-graph` passed with 10 nodes and no dependency
    cycles or competing in-progress nodes;
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run typecheck` passed;
  - `npm run test` passed with 40 files and 270 tests;
  - `npm run build` passed;
  - `git diff --check` passed.
- Next unblocked nodes after verification: `P47-020-contracts` and
  `P47-060-data-inventory`.

## 2026-08-29T00:00:00Z - Phase 47 baseline recovery and engine start

- Requested task: begin the intelligence-engine work autonomously with an
  agent-operable graph, durable documentation after every work unit, real-user
  quality, and no mock production intelligence.
- Repo and branch: cloned `AyobamiH/tax-lien-intelligence-platform`, verified
  `main` at `f7b6cbeab0d35712a60933c598e6fcfa39ffdd5d`, and created
  `feature/intelligence-engine-foundation` from that commit.
- Starting-state verification:
  - `npm ci` completed with 364 packages installed;
  - `npm run typecheck` passed;
  - `npm run build` passed;
  - `npm run test` exposed one inherited nondeterministic failure in the
    maintenance failure-suppression scenario;
  - `npm run audit` exposed four newly disclosed advisories in current
    lockfile resolutions, including two high-severity advisories.
- Root cause: latest target-job lookup sorted only by millisecond-level queue
  and creation timestamps. Jobs created in the same millisecond could compare
  equal, causing the initial score job to be selected instead of the newer
  failed policy refresh.
- Work completed:
  - added `_id` as the final Mongo latest-job sort key;
  - aligned the in-memory verification store with queued time, creation time,
    and identifier ordering;
  - added focused coverage for timestamp-collision selection;
  - refreshed only safe lockfile resolutions selected by `npm audit fix`,
    including patched Mongoose, PostCSS, nanoid, body-parser, MongoDB driver,
    BSON, SASL prep, and connection-string packages;
  - recorded the repair in the changelog.
- Changed-state declaration: source, test, changelog, lockfile remediation,
  and ledger work only. No deployment, migration, service restart, production
  mutation, secret read, or fabricated engine result.
- Verification:
  - focused internal-job and scoring suites passed with 32 tests;
  - the formerly nondeterministic 27-test scoring suite passed two additional
    consecutive runs;
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run typecheck` passed;
  - `npm run test` passed with 40 files and 270 tests;
  - `npm run build` passed;
  - `git diff --check` passed before final ledger alignment.
- Next safe step: commit and push this recovered baseline, then establish the
  Phase 47 work graph and engine contracts.

## 2026-07-08T12:55:00+01:00 - Repo-local agent entry point

- Requested task: run the next safe step after the workflow investigation.
- Workflow lane: repo hygiene and local documentation control.
- Risk classification: safe local docs edit; no source runtime code, package
  install, dependency update, commit, push, deploy, migration, service
  lifecycle action, production mutation, external action, or secret-file read.
- What was inspected: current git status, `OPENCLAW_RUNBOOK.md`,
  `WORK_LEDGER.md`, `MISSION.md`, `ACCEPTANCE.md`, `README.md`, and
  `docs/README.md`.
- Work completed:
  - added a thin repo-local `AGENTS.md` entry point;
  - pointed future agents to the existing mission, acceptance, runbook, ledger,
    and docs index;
  - recorded the canonical OpenClaw bounded path under `workspace/projects/`;
  - preserved existing approval boundaries and verification expectations.
- Changed-state declaration: local documentation/control files changed only.
- Validation: `git diff --check -- AGENTS.md WORK_LEDGER.md` passed.
- Next safe step: review the doc-only diff and decide whether to commit it;
  commit and push remain approval-bound unless explicitly authorized.

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

## 2026-07-07T09:34:00+01:00 - Local runtime smoke push completion

- Commit created: `976a4e5` (`test: add local runtime smoke`).
- Push target: tracked upstream `oneclick/main`.
- Push result: succeeded, advancing `oneclick/main` from `da8d581` to
  `976a4e5`.
- Pre-push hook result:
  - dependency install check reported packages up to date and 0
    vulnerabilities;
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run typecheck` passed;
  - `npm run test` passed with 37 files and 261 tests;
  - `npm run build` passed.
- Post-push state expected: clean working tree on `main` tracking
  `oneclick/main` after this ledger completion entry is committed and pushed.
- Remaining limits: `npm run smoke:local` proves local HTTP API/web-shell
  runtime behavior but does not provide browser-driver screenshots, real
  MongoDB-backed end-to-end proof, deployed proof, or Crabbox proof.
- Next safe step: continue to interactive browser-driver proof if a safe local
  browser tool is available, otherwise continue the next roadmap hardening
  task.

## 2026-07-07T09:58:02+01:00 - Browser-like DOM smoke evidence

- Requested task: continue autonomous Tax Lien project work from current repo
  truth, prioritize local browser proof, diagnose/repair Crabbox if safely
  possible, fall back to the strongest non-Crabbox verification if needed,
  update control files, verify, commit, push, and continue unless blocked.
- Repo path used: `/home/oneclickwebsitedesignfactory/tax-lien-platform`;
  fallback typo path `/home/oneclickwebsitefactory/tax-lien-platform` was not
  used.
- Branch and starting HEAD: `main` at
  `e091a56ee7e45ea58107a4b209c736c7155717e5`.
- Starting state: clean working tree tracking `oneclick/main`.
- What was inspected: git status, branch, remotes, recent commits, package
  scripts, Vite/web package, API package, `scripts/local-runtime-smoke.mjs`,
  project-control files, frontend entrypoints, app routing/session bootstrap,
  existing tests, browser tool availability, and Crabbox wrapper/registry
  availability.
- Coding evidence tools used first:
  - `coding_validate_project` completed;
  - `coding_repo_map` completed;
  - `coding_route_trace`, `coding_api_contract_audit`, `coding_env_audit`, and
    `coding_secret_audit` were adapter-limited, so direct local inspection was
    used for route/runtime/browser details.
- Verified facts discovered:
  - current HEAD is the previously pushed runtime-smoke ledger commit;
  - no `crabbox` binary is available on PATH;
  - the OpenClaw `crabbox-wrapper.mjs` is present but fails basic
    `--help`/`run --help` sanity checks because no usable CLI is resolved;
  - public npm has `@openclaw/crabbox-plugin@0.23.0`, but no `crabbox` CLI
    package was found by `npm view crabbox`;
  - no Chromium, Chrome, or Firefox binary is available on PATH;
  - the repo already has `jsdom`, React, ReactDOM, and Vitest available for a
    dependency-free browser-like DOM render smoke.
- Assumptions made: jsdom render/bootstrap proof is the strongest safe local
  browser-adjacent evidence available without adding a browser driver or
  claiming screenshots/Crabbox proof.
- Chosen next task and why: add `npm run smoke:browser` because it improves
  local browser-surface confidence using existing dependencies and keeps the
  evidence boundary honest.
- Files changed:
  - `package.json`;
  - `tests/unit/web-app-smoke.test.ts`;
  - `README.md`;
  - `ACCEPTANCE.md`;
  - `OPENCLAW_RUNBOOK.md`;
  - `docs/architecture/frontend-review.md`;
  - `WORK_LEDGER.md`.
- Changed-state declaration: test/docs/control/package-script files changed.
  No dependency install, deployment, migration, service lifecycle action,
  production mutation, destructive action, or secret read was performed.
- Verification:
  - initial `npm run smoke:browser` passed with 1 test file and 2 tests;
  - `git diff --check` passed;
  - `npm run typecheck` passed;
  - targeted `npm run smoke:browser` passed with 1 test file and 2 tests;
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run test` passed with 38 files and 263 tests;
  - `npm run build` passed;
  - `npm run smoke:local` passed after building the workspace and verifying
    API health/404 plus built web assets over local HTTP.
- Crabbox result:
  - `command -v crabbox` returned no binary;
  - `node .../openclaw/scripts/crabbox-wrapper.mjs --help` failed sanity
    checks;
  - `node .../openclaw/scripts/crabbox-wrapper.mjs run --help` failed sanity
    checks;
  - `npm view crabbox` returned 404;
  - `npm view @openclaw/crabbox-plugin` returned plugin metadata but no CLI
    `bin`;
  - no Crabbox run occurred and no Crabbox proof is claimed.
- Remaining limits: `npm run smoke:browser` is browser-like DOM
  render/bootstrap proof only. It is not a real browser-driver run, screenshot
  evidence, MongoDB-backed end-to-end workflow proof, deployed proof, or
  Crabbox proof.
- Next safe step: commit and push the browser-like smoke evidence task, then
  continue with the next bounded roadmap/hardening task unless a permission
  boundary is reached.

## 2026-07-07T10:12:00+01:00 - Browser-like DOM smoke push completion

- Commit created: `937e211` (`test: add browser render smoke`).
- Push target: tracked upstream `oneclick/main`.
- Push result: succeeded, advancing `oneclick/main` from `e091a56` to
  `937e211`.
- Pre-push hook result:
  - dependency install check reported packages up to date and 0
    vulnerabilities;
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run typecheck` passed;
  - `npm run test` passed with 38 files and 263 tests;
  - `npm run build` passed.
- Post-push state expected: clean working tree on `main` tracking
  `oneclick/main` after this ledger completion entry is committed and pushed.
- Remaining limits: no real browser-driver screenshots, no MongoDB-backed live
  end-to-end smoke, no deployed proof, and no Crabbox proof.
- Next safe step: continue from repo truth with the next bounded
  product-continuity or hardening task; if a safe browser binary or real
  Crabbox CLI later becomes available, use it for screenshots/browser-driver
  evidence.

## 2026-07-07T11:48:00+01:00 - Phase 44 follow-up reminder workflow

- Requested task: resume the interrupted Phase 44 implementation from the
  current local repo state, finish it without restarting, verify, commit, push,
  and explicitly state whether local commit `94f965a` was pushed.
- Repo path used: `/home/oneclickwebsitedesignfactory/tax-lien-platform`.
- Branch and starting state:
  - local `main` at `94f965a11c35cb23c780b476aec815e5660ad1ec`;
  - remote `oneclick/main` at
    `937e2119725cebcf4cac44a91c5203c1b1976edb`;
  - local `main` ahead by one ledger/docs commit;
  - working tree had preserved uncommitted Phase 44 edits, so the prompt's
    clean-tree/push-only condition was false.
- Decision: do not push `94f965a` alone while the Phase 44 patch is dirty;
  preserve the patch, finish Phase 44, then push the local-ahead commit and
  Phase 44 commit together after verification.
- Work completed:
  - added shared follow-up DTOs, due/reminder state types, follow-up alert
    metadata, My Work follow-up queue contracts, and cadence activity types;
  - added a Mongo follow-up model and exports;
  - added follow-up store, service, router, factory, and worker scheduler scan;
  - wired follow-up state into the API app, My Work aggregation, alert service,
    notification preferences, notification delivery metadata, workspace
    activity summaries, and worker scheduler config;
  - added compact web follow-up controls to comparison, watchlist, and
    portfolio detail surfaces;
  - added actionable follow-up queue visibility to My Work;
  - added in-memory follow-up store support and integration/frontend contract
    coverage;
  - updated `.env.example`, API docs, architecture docs, changelog, README
    index, and KB truth for Phase 44;
  - preserved the boundary that follow-ups are a bounded operational cadence
    layer, not task management, calendar recurrence, SLA escalation, workforce
    planning, auction execution, or AI scheduling.
- Verification:
  - early `npm run typecheck` failed on exact optional property and new
    review-model exhaustiveness gaps, then passed after fixes;
  - `npx vitest run tests/integration/follow-ups.test.ts --testTimeout=60000`
    passed with 1 file and 3 tests;
  - `npm run typecheck` passed;
  - `npx vitest run tests/integration/follow-ups.test.ts tests/integration/my-work.test.ts tests/unit/web-api.test.ts tests/unit/web-app-smoke.test.ts --testTimeout=60000`
    passed with 4 files and 31 tests;
  - `git diff --check` passed;
  - `npm install` completed with packages up to date and 0 vulnerabilities;
  - `npm run typecheck` passed;
  - first full `npm run test` failed because
    `tests/integration/notification-preferences.test.ts` still expected the
    pre-Phase-44 default preference rule list;
  - updated that test to include `follow_up_due`;
  - `npx vitest run tests/integration/notification-preferences.test.ts --testTimeout=60000`
    passed with 1 file and 7 tests;
  - full `npm run test` passed with 39 files and 266 tests;
  - `npm run build` passed;
  - `npm audit` passed with 0 vulnerabilities;
  - final `git diff --check` passed;
  - final `npm run typecheck` passed.
- Changed-state declaration: local code, tests, docs, and ledger are modified.
  No deployment, migration, production mutation, service lifecycle action,
  destructive action, or secret read was performed.
- Remaining action before completion: final git identity check, commit, push,
  and local/remote match verification.

## 2026-07-07T12:03:00+01:00 - Phase 44 push completion

- Git identity verified before commit:
  `AyobamiH <AyobamiH@users.noreply.github.com>`.
- Product commit created: `f6313bf`
  (`feat: implement phase 44 follow-up reminder workflow`).
- Push target: tracked upstream `oneclick/main`.
- Push result: succeeded, advancing `oneclick/main` from `937e211` to
  `f6313bf`.
- The previously local-only ledger/docs commit `94f965a` was pushed as part of
  the same `main` push.
- Pre-push hook result:
  - dependency install check reported packages up to date and 0
    vulnerabilities;
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run typecheck` passed;
  - `npm run test` passed with 39 files and 266 tests;
  - `npm run build` passed.
- Post-push verification:
  - local `HEAD` and remote `oneclick/main` both resolved to
    `f6313bf65e34666dc834ad151a4e1839338239ae`;
  - working tree was clean before this ledger completion entry.
- Remaining limits: no deployed proof, no MongoDB-backed live workflow smoke,
  no real browser-driver screenshots, and no Crabbox proof.
- Next safe step: continue from repo truth with the next bounded
  product-continuity or hardening task; Crabbox remains a verification gap
  unless a usable local CLI becomes available or can be safely installed.

## 2026-07-07T12:45:00+01:00 - Pre-Phase-45 abandoned verification recovery

- Requested task: identify and implement work that was left behind when Phase
  44 was taken on before considering Phase 45.
- Verified abandoned work from memory and ledger:
  - real browser-driver screenshots remained unavailable;
  - deployed proof remained a permission boundary;
  - MongoDB-backed live follow-up workflow smoke remained unimplemented;
  - Crabbox proof remained unavailable because the CLI was previously missing.
- Current Crabbox state before this task:
  - Crabbox CLI `0.36.0` is now installed locally;
  - `crabbox doctor --provider local-container` passes;
  - brokered/cloud proof still requires provider login/config.
- Chosen next task and why: add a repeatable Mongo-backed follow-up smoke
  before Phase 45 because it is the strongest abandoned verification gap that
  can be implemented without production credentials, deployment, migrations, or
  browser-driver setup.
- Files changed:
  - `package.json`;
  - `scripts/mongo-follow-up-smoke.mjs`;
  - `docs/changelog.md`;
  - `WORK_LEDGER.md`.
- Expected smoke behavior:
  - builds the workspace;
  - connects to a supplied MongoDB URI using a unique temporary database name;
  - starts the API app in-process;
  - registers an authenticated user and resolves the real workspace context;
  - seeds one portfolio record through the Mongo model;
  - sets a due follow-up through the authenticated API;
  - verifies My Work/follow-up queue state;
  - runs the real follow-up reminder service against Mongo;
  - verifies one `follow_up_due` alert and duplicate suppression;
  - clears the follow-up and verifies no further due scan candidates remain;
  - drops only the temporary smoke database during cleanup.
- Boundaries preserved:
  - no production database, production credentials, deployment, migration, or
    service lifecycle mutation;
  - no browser-driver screenshot proof claimed;
  - no brokered/cloud Crabbox proof claimed unless a later configured provider
    run succeeds.
- First verification:
  - `git diff --check` passed;
  - `npm run smoke:mongo` passed against a temporary local `mongo:7` container
    and printed `mongo follow-up smoke passed`;
  - the temporary Docker container was removed after the run;
  - `crabbox doctor --provider local-container` passed with `leases=0`;
  - `crabbox doctor --provider docker-sandbox` failed because `sbx` is not on
    `PATH`;
  - no Crabbox run proof is claimed because local-container run previously
    stalled on default image SSH readiness and docker-sandbox lacks its provider
    CLI.
- Full verification:
  - `npm install` passed with packages up to date and 0 vulnerabilities;
  - `npm run typecheck` passed;
  - `npm run test` passed with 39 files and 266 tests;
  - `npm run build` passed;
  - `npm audit` passed with 0 vulnerabilities;
  - final `npm run smoke:mongo` passed against a temporary local `mongo:7`
    container and printed `mongo follow-up smoke passed`;
  - final `git diff --check` passed.
- Remaining limits after this recovery:
  - no deployed proof;
  - no real browser-driver screenshots;
  - no brokered/cloud Crabbox proof until a provider is configured;
  - Phase 45 follow-up completion/snooze remains unimplemented and should be
    started only after this verification recovery is committed and pushed.

## 2026-07-07T12:50:00+01:00 - Mongo follow-up smoke push completion

- Commit created: `354a53a`
  (`test: add mongo follow-up smoke`).
- Push target: tracked upstream `oneclick/main`.
- Push result: succeeded, advancing `oneclick/main` from `ff4e0e7` to
  `354a53a`.
- Pre-push hook result:
  - dependency install check reported packages up to date and 0
    vulnerabilities;
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run typecheck` passed;
  - `npm run test` passed with 39 files and 266 tests;
  - `npm run build` passed.
- Post-push verification:
  - local `HEAD`, local `oneclick/main`, and remote `refs/heads/main` all
    resolved to `354a53a7f384d8b4e03def8cf3be6443d424ce53`;
  - working tree was clean before this ledger completion entry.
- Abandoned pre-Phase-45 work recovered:
  - MongoDB-backed follow-up workflow smoke is now repeatable via
    `npm run smoke:mongo`;
  - Crabbox is installed and doctor-ready locally, but no brokered/cloud run
    proof is claimed without provider configuration.
- Next safe step: begin Phase 45 follow-up completion/snooze/control workflow
  from the clean pushed repo truth.

## 2026-07-07T13:36:00+01:00 - Phase 45 follow-up control workflow

- Requested task: finish Phase 45 follow-up completion, snooze, and
  follow-through control from the interrupted local patch.
- Repo path used: `/home/oneclickwebsitedesignfactory/tax-lien-platform`.
- Branch and starting HEAD: `main` at
  `5868f1bf2ace6970af396773521df31d33a00572`.
- Verified facts discovered:
  - Phase 44 follow-up reminders and Mongo smoke recovery were already pushed;
  - the interrupted Phase 45 patch was preserved as uncommitted local edits;
  - local branch tracked `oneclick/main`;
  - no Phase 45 commit had been created before this run.
- Assumptions made:
  - completion should suppress future reminders while keeping the follow-up
    inspectable on the target;
  - snooze should be an explicit reschedule action that resets reminder state
    and records previous/new due context;
  - acknowledgement/seen state is not justified yet because completion and
    snooze solve the reminder-fatigue problem without extra workflow.
- Work completed:
  - added shared follow-up completion/snooze response contracts, completion
    due state, snooze metadata, and narrowed follow-up alert due-state
    metadata to actual `due`/`overdue` alerts;
  - extended Mongo and in-memory follow-up stores with completion and snooze
    persistence plus active-list/reminder suppression for completed records;
  - added authenticated complete and snooze routes with selected-workspace
    write access and target access revalidation;
  - updated follow-up service behavior so completion suppresses future scans
    and snooze resets reminder state against the new due date;
  - added bounded workspace activity events for completion and snooze while
    avoiding note text in activity metadata;
  - added frontend complete and snooze controls on supported follow-up surfaces
    and My Work follow-up queue cards;
  - added integration coverage for completion, queue/reminder suppression,
    invalid snooze dates, snooze metadata, and reminder reset after snooze;
  - updated API docs, alert/follow-up architecture, KBs, changelog, and
    acceptance controls to reflect Phase 45 truth.
- Files changed:
  - `ACCEPTANCE.md`;
  - `apps/api/src/follow-ups/follow-up-service.ts`;
  - `apps/api/src/follow-ups/follow-up-store.ts`;
  - `apps/api/src/routes/follow-ups.ts`;
  - `apps/api/src/workspace-activity/workspace-activity-service.ts`;
  - `apps/web/src/App.tsx`;
  - `apps/web/src/api.ts`;
  - `apps/web/src/review-model.ts`;
  - `docs/api/follow-ups.md`;
  - `docs/architecture/alerts.md`;
  - `docs/architecture/follow-ups.md`;
  - `docs/changelog.md`;
  - `docs/kb/README.md`;
  - `docs/kb/automation-and-intelligence-kb.md`;
  - `docs/kb/backend-direction-kb.md`;
  - `docs/kb/current-surface-kb.md`;
  - `docs/kb/frontend-direction-kb.md`;
  - `docs/kb/master-product-kb.md`;
  - `docs/kb/repo-reality-kb.md`;
  - `docs/kb/roadmap-and-phase-boundaries-kb.md`;
  - `docs/kb/security-hardening-kb.md`;
  - `docs/kb/shared-contract-kb.md`;
  - `packages/db/src/models/alert.ts`;
  - `packages/db/src/models/follow-up.ts`;
  - `packages/db/src/models/workspace-activity.ts`;
  - `packages/types/src/index.ts`;
  - `tests/integration/follow-ups.test.ts`;
  - `tests/support/in-memory-follow-up-store.ts`;
  - `WORK_LEDGER.md`.
- Checks run:
  - `git diff --check` passed;
  - `npm install` passed with packages up to date and 0 vulnerabilities;
  - `npm run typecheck` passed;
  - `npx vitest run tests/integration/follow-ups.test.ts tests/unit/web-api.test.ts tests/unit/web-app-smoke.test.ts --testTimeout=60000`
    passed with 3 files and 30 tests;
  - `npm run test` passed with 39 files and 268 tests;
  - `npm run build` passed;
  - `npm audit` passed with 0 vulnerabilities.
- Results:
  - supported records can now have follow-ups completed or snoozed safely;
  - completed follow-ups no longer appear in active queues or scheduler scans;
  - snoozed follow-ups reset reminder state and defer reminders until the new
    due date;
  - UI exposes practical follow-up status, completion, and snooze controls;
  - docs and KBs reflect that this remains a bounded reminder layer, not a
    task/calendar system.
- Remaining limits:
  - no deployed proof;
  - no real browser-driver screenshots;
  - no brokered/cloud Crabbox proof;
  - Mongo-backed smoke remains Phase 44 coverage and was not rerun in this
    Phase 45 pass.
- Blockers: none after local verification.
- Next safe step: commit and push Phase 45 after setting the requested Git
  identity, then verify local and remote `main` match.

## 2026-07-07T13:44:00+01:00 - Phase 45 push completion

- Commit created: `9d7d801`
  (`feat: implement phase 45 follow-up control workflow`).
- Push target: tracked upstream `oneclick/main`.
- Push result: succeeded, advancing `oneclick/main` from
  `5868f1b` to `9d7d801`.
- Pre-push hook result:
  - dependency install check reported packages up to date and 0
    vulnerabilities;
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run typecheck` passed;
  - `npm run test` passed with 39 files and 268 tests;
  - `npm run build` passed.
- Post-push verification:
  - local `HEAD`, local `oneclick/main`, and remote `refs/heads/main` all
    resolved to `9d7d80118f96acb1915d3f07189fcc45e1db8853`;
  - working tree was clean before this ledger completion entry.
- Phase 45 completion:
  - follow-up completion and snooze/reschedule control is now implemented on
    main;
  - completion suppresses future queue/reminder behavior;
  - snooze resets reminder state and defers reminders until the new due date;
  - recurring reminders, calendar integration, task-board workflows, SLA
    engines, and AI reminder optimization remain out of scope.
- Next safe step: run a bounded Mongo-backed Phase 45 smoke or browser-driver
  proof when a suitable local verification path is selected; do not claim
  deployed, screenshot, or brokered Crabbox proof until actually run.

## 2026-07-07T13:55:00+01:00 - Phase 45 Mongo smoke hardening

- Requested task: continue the roadmap hardening task after Phase 45.
- Repo path: `/home/oneclickwebsitedesignfactory/tax-lien-platform`.
- Branch and starting HEAD: `main` at
  `a2686d4eb57d8046512fb75a1f07ddc4e3dd72c4`.
- Verified facts:
  - working tree was clean at the start of this hardening pass;
  - Phase 45 was already committed and pushed;
  - the next documented safe task was a bounded Mongo-backed Phase 45 smoke for
    completion and snooze behavior.
- Assumptions made:
  - local Docker-backed `mongo:7` smoke execution is acceptable runtime
    verification because the existing smoke script already uses that pattern;
  - browser-driver and brokered Crabbox proof remain separate evidence paths.
- Chosen next task and why: extend `npm run smoke:mongo` to prove Phase 45
  completion/snooze behavior against the built API and real Mongo store path,
  because this was the strongest missing local runtime proof after Phase 45.
- Files changed:
  - `apps/api/src/follow-ups/follow-up-store.ts`;
  - `docs/architecture/follow-ups.md`;
  - `docs/changelog.md`;
  - `scripts/mongo-follow-up-smoke.mjs`;
  - `WORK_LEDGER.md`.
- Work completed:
  - extended the Mongo follow-up smoke to complete a due follow-up, verify
    queue/reminder suppression, snooze the same target to a future date, verify
    reminder reset and previous-due-date context, and confirm a new bounded
    due reminder after the snoozed date;
  - fixed the Mongo follow-up store previous-record lookup so snooze metadata
    is derived from the workspace/entity target key instead of the full
    mutation input;
  - updated changelog and architecture docs to record the Phase 45 smoke
    coverage.
- Checks run:
  - `npm run smoke:mongo` initially exposed the Mongo previous-record lookup
    issue, then passed after the store fix against a temporary local `mongo:7`
    container and printed `mongo follow-up smoke passed`;
  - `git diff --check` passed;
  - `npm run typecheck` passed;
  - `npx vitest run tests/integration/follow-ups.test.ts --testTimeout=60000`
    passed with 1 file and 5 tests;
  - `npm run test` passed with 39 files and 268 tests;
  - `npm run build` passed;
  - `npm audit` passed with 0 vulnerabilities.
- Results:
  - Phase 45 completion and snooze behavior now has real Mongo-backed runtime
    coverage in addition to automated unit/integration tests;
  - the smoke covers reminder suppression after completion and reminder
    deferral/reset after snooze.
- Remaining limits:
  - no deployed proof;
  - no browser-driver screenshot proof;
  - no brokered/cloud Crabbox proof.
- Blockers: none before final checks.
- Next safe step: run the required checks, commit, push, and verify local and
  remote `main` match if all checks pass.

## 2026-07-07T14:08:00+01:00 - Phase 45 Mongo smoke hardening push completion

- Commit created: `86eeb9a`
  (`test: harden phase 45 mongo follow-up smoke`).
- Push target: tracked upstream `oneclick/main`.
- Push result: succeeded, advancing `oneclick/main` from
  `a2686d4` to `86eeb9a`.
- Pre-push hook result:
  - dependency install check reported packages up to date and 0
    vulnerabilities;
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run typecheck` passed;
  - `npm run test` passed with 39 files and 268 tests;
  - `npm run build` passed.
- Completion:
  - Mongo-backed Phase 45 complete/snooze smoke hardening is now on main;
  - the smoke verifies completed follow-up reminder suppression and snoozed
    follow-up reminder deferral/reset against the real Mongo store path;
  - the Mongo previous-record lookup fix is included on main.
- Remaining limits:
  - no deployed proof;
  - no browser-driver screenshot proof;
  - no brokered/cloud Crabbox proof.
- Next safe step: continue roadmap hardening from clean repo truth, with a
  browser-driver smoke for Phase 45 follow-up controls as the next strongest
  verification candidate.

## 2026-07-07T17:36:00+01:00 - Phase 46 browser-like follow-up smoke proof

- Requested task: implement the next action end to end after the Phase 46
  browser-proof follow-up smoke was interrupted.
- Repo path: `/home/oneclickwebsitedesignfactory/tax-lien-platform`.
- Branch and starting HEAD: `main` at
  `d859470d7414ecbbbd9bf315363c37b063aae6a6`.
- Verified facts:
  - local `HEAD` and `oneclick/main` matched at `d859470` before this work;
  - the interrupted patch contained `package.json` and a new
    `tests/unit/follow-up-browser-smoke.test.ts`;
  - Phase 45 product behavior and Mongo-backed smoke hardening were already on
    `main`.
- Assumptions made:
  - a focused jsdom smoke is the strongest bounded local browser-like proof
    available without deploying, using production data, or adding a wide E2E
    suite;
  - screenshot and brokered/cloud Crabbox proof remain separate evidence paths.
- Chosen next task and why: finish the Phase 46 follow-up browser-like smoke,
  because the remaining verified gap was UI lifecycle proof for due-state,
  completion, and snooze controls.
- Files changed:
  - `package.json`;
  - `tests/unit/follow-up-browser-smoke.test.ts`;
  - `README.md`;
  - `ACCEPTANCE.md`;
  - `OPENCLAW_RUNBOOK.md`;
  - `docs/api/follow-ups.md`;
  - `docs/architecture/follow-ups.md`;
  - `docs/changelog.md`;
  - `docs/kb/automation-and-intelligence-kb.md`;
  - `docs/kb/backend-direction-kb.md`;
  - `docs/kb/current-surface-kb.md`;
  - `docs/kb/frontend-direction-kb.md`;
  - `docs/kb/master-product-kb.md`;
  - `docs/kb/repo-reality-kb.md`;
  - `docs/kb/roadmap-and-phase-boundaries-kb.md`;
  - `docs/kb/security-hardening-kb.md`;
  - `docs/kb/shared-contract-kb.md`;
  - `WORK_LEDGER.md`.
- Work completed:
  - added `npm run smoke:follow-ups:browser`;
  - extended `npm run smoke:browser` to include the follow-up lifecycle smoke;
  - added a browser-like jsdom smoke that mounts the authenticated React shell,
    opens the portfolio surface, renders a due follow-up, drives update,
    complete, and snooze controls, verifies follow-up requests carry bearer
    auth and selected workspace headers, and writes bounded JSON evidence;
  - tightened the smoke so snooze changes the due date to a later date and
    verifies reminder state resets to `none`;
  - updated docs and KB files to record this as browser-like/runtime proof, not
    screenshot, deployed, production, or brokered Crabbox proof.
- Checks run:
  - initial `npm run smoke:follow-ups:browser` passed, but evidence showed the
    snooze date had not changed;
  - the smoke harness was fixed to update the controlled date input through
    the native input setter;
  - `npm run smoke:follow-ups:browser` passed and wrote
    `/tmp/tax-lien-follow-up-browser-smoke.json` with final due date
    `2026-07-14T12:00:00.000Z`, final due state `upcoming`, reminder state
    `none`, and previous due date `2026-07-07T12:00:00.000Z`.
  - `npm install` passed with packages up to date and 0 vulnerabilities;
  - `git diff --check` passed;
  - `npm run typecheck` passed;
  - `npm run smoke:follow-ups:browser` passed with 1 file and 1 test;
  - `npm run smoke:browser` passed with 2 files and 3 tests;
  - `npm run test` passed with 40 files and 269 tests;
  - `npm run build` passed;
  - `npm audit` passed with 0 vulnerabilities;
  - `npm run audit` passed with 0 high-severity vulnerabilities.
- Remaining limits:
  - no deployed or production proof;
  - no browser-driver screenshot proof;
  - no brokered/cloud Crabbox proof.
- Blockers: none before final checks.
- Next safe step: run the required gates, commit, push, and verify local and
  remote `main` match if all checks pass.

## 2026-07-07T18:14:00+01:00 - Phase 46 browser-like smoke push completion

- Commit created: `54b9c8c`
  (`test: add follow-up browser runtime smoke proof`).
- Push target: tracked upstream `oneclick/main`.
- Push result: succeeded after a resumed push, advancing `oneclick/main` from
  `d859470` to `54b9c8c`.
- Pre-push hook result:
  - dependency install check reported packages up to date and 0
    vulnerabilities;
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run typecheck` passed;
  - `npm run test` passed with 40 files and 269 tests;
  - `npm run build` passed.
- Post-push verification:
  - local `HEAD`, local `oneclick/main`, and remote `refs/heads/main` all
    resolved to `54b9c8cca26f495c0ce3d6fe43ae695d98111bdc`.
- Completion:
  - Phase 46 browser-like follow-up lifecycle smoke proof is now on main;
  - `npm run smoke:browser` includes the follow-up lifecycle smoke;
  - focused evidence remains local JSON/browser-like proof, not deployed,
    screenshot, production, or brokered Crabbox proof.
- Remaining limits:
  - no deployed or production proof;
  - no browser-driver screenshot proof;
  - no brokered/cloud Crabbox proof.
- Next safe step: continue from clean repo truth into the next roadmap
  hardening/product-continuity task.

## 2026-08-29T09:04:39Z - Phase 47 versioned intelligence contracts

- Requested task: begin autonomous, graph-governed intelligence-engine work
  without mock production intelligence and document every completed work unit.
- Graph node: `P47-020-contracts`.
- Repository: `AyobamiH/tax-lien-intelligence-platform`.
- Branch and starting commit:
  `feature/intelligence-engine-foundation` at `f236b72`.
- Verified assumptions:
  - the current scoring package is a deterministic rules implementation;
  - its `redemptionProbability` is a fixed heuristic, not a trained or
    calibrated probability;
  - no verified model artifact or historical redemption outcome dataset exists
    in this repository;
  - current API compatibility must be preserved while the engine boundary is
    introduced.
- Work completed:
  - added `@tax-lien/engine-contract` as an independently buildable TypeScript
    workspace package;
  - defined versioned candidate-evidence, provenance, jurisdiction,
    applicability, engine-result, finding, signal, and model-artifact types;
  - added dependency-free runtime validators that reject unknown properties,
    invalid versions, broken source references, values without provenance,
    invalid timestamps and digests, duplicate signals, and inconsistent result
    states;
  - made unknown, unavailable, not-applicable, deterministic, heuristic,
    model-backed, and not-computed states explicit;
  - prohibited available redemption probability unless it is a bounded model
    output with a versioned artifact and evaluation reference;
  - reserved `redemption_heuristic_signal` for fixed-rule redemption output and
    prohibited it from using a probability unit;
  - published strict JSON Schemas and a schema version manifest for future
    cross-language service parity;
  - documented the current API compatibility boundary and corrected the legacy
    heuristic's precision claim without breaking its response shape.
- Tests added:
  - 9 runtime contract and schema-manifest tests covering provenance, explicit
    abstention, unsupported values, heuristic/probability separation, and
    model-artifact requirements.
- Checks run:
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run validate:work-graph` passed with 10 nodes;
  - `npm run typecheck` passed;
  - focused contract tests passed with 1 file and 9 tests;
  - `npm run test` passed with 41 files and 279 tests;
  - `npm run build` passed for API, web, DB, scoring, types, and engine-contract
    workspaces;
  - JSON Schema parse check and `git diff --check` passed.
- Documentation updated:
  - `docs/engine/contracts.md`;
  - `docs/engine/status.md`;
  - `docs/engine/work-graph.json`;
  - `docs/architecture/scoring.md`;
  - `docs/api/scoring.md`;
  - `docs/kb/shared-contract-kb.md`;
  - `docs/README.md`;
  - `docs/changelog.md`;
  - `WORK_LEDGER.md`.
- Verified limits:
  - this node defines and enforces contracts but does not claim live county
    ingestion, jurisdiction-rule correctness, trained models, calibration,
    deployed service behavior, or ChatGPT tool readiness;
  - deterministic contract vectors validate shape only and are not production
    intelligence or model evidence;
  - the external OneClickPostFactory repository was not verified or mutated,
    and no cross-repository sync is claimed.
- Blockers: none for the next rule-engine node.
- Newly ready nodes:
  - `P47-030-rule-engine`;
  - `P47-060-data-inventory` remains independently ready.

## 2026-08-29T09:20:20Z - Phase 47 versioned jurisdiction rule engine

- Requested task: continue building a reliable intelligence engine without
  placeholders, use verified existing sources, and keep agent work documented
  and graph governed.
- Graph node: `P47-030-rule-engine`.
- Repository: `AyobamiH/tax-lien-intelligence-platform`.
- Branch and starting commit:
  `feature/intelligence-engine-foundation` at `9f89fc2`.
- Primary-source verification completed on 2026-08-29:
  - A.R.S. 42-18053 for the delinquent-tax interest rate;
  - A.R.S. 42-18101 for sale and foreclosure of real-property tax liens;
  - A.R.S. 42-18114 for successful-purchaser and bid-rate mechanics;
  - A.R.S. 42-18115 for easements and specified liens not extinguished by
    sale;
  - A.R.S. 42-18118 for the certificate of purchase;
  - A.R.S. 42-18127 for certificate expiration and exceptions;
  - A.R.S. 42-18152 for redemption timing;
  - A.R.S. 42-18201 for the redemption-foreclosure action window;
  - A.R.S. 42-18202 for notice before a foreclosure action.
- Work completed:
  - added the independently buildable `@tax-lien/jurisdiction-rules` package;
  - added immutable rule-pack, rule, citation, source-class, and evaluation
    contracts;
  - registered only
    `us-az-maricopa-statutory-baseline@2026-08-29.1`, with normalized aliases
    that do not broaden coverage beyond Maricopa County;
  - separated primary statutory context, future county operating rules, and
    internal underwriting policy so a platform threshold cannot be presented
    as law;
  - recorded every statutory rule's Legislature authority, section, URL, and
    verification timestamp;
  - implemented exact-scope lookup, citation resolution, canonical candidate
    evidence serialization, and SHA-256 evidence digesting;
  - implemented deterministic evaluation that computes only value coverage
    from positive, same-currency evidence;
  - returns `out_of_scope` for unregistered jurisdictions and
    `insufficient_evidence` when parcel, lien, value, or currency evidence is
    inadequate;
  - applies hard exclusion findings only for known value coverage below one or
    observed lack of road access, retaining the source evidence references;
  - returns redemption probability as unavailable because no promoted model
    artifact exists;
  - marks Maricopa auction registration, eligibility, deposit, schedule,
    payment, platform, and live-file rules as not verified instead of encoding
    assumptions.
- Tests added:
  - 10 jurisdiction-rule tests covering exact registry scope, canonical
    aliases, citation integrity, primary-source classes, out-of-scope behavior,
    insufficient evidence, deterministic value coverage, both hard exclusions,
    invalid contract rejection, stable evidence digesting, and timestamp
    rejection;
  - focused engine-contract and rule-engine run passed with 2 files and 19
    tests.
- Checks run:
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run validate:work-graph` passed with 10 nodes;
  - `npm run typecheck` passed;
  - `npm run test` passed with 42 files and 289 tests;
  - `npm run build` passed for all workspaces, including engine-contract and
    jurisdiction-rules;
  - `git diff --check` passed.
- Documentation updated:
  - `docs/engine/rule-packs.md`;
  - `docs/engine/status.md`;
  - `docs/engine/work-graph.json`;
  - `docs/engine/phase-47-plan.md`;
  - `docs/architecture/scoring.md`;
  - `docs/kb/shared-contract-kb.md`;
  - `docs/README.md`;
  - `docs/changelog.md`;
  - `WORK_LEDGER.md`.
- Verified limits:
  - this is a source-versioned deterministic baseline, not legal advice or an
    attorney review;
  - no current county auction mechanics, live auction data, title condition,
    bankruptcy status, trained probability, model calibration, deployment, or
    user outcome is claimed;
  - statutory changes require a new immutable rule-pack version and source
    review;
  - the external OneClickPostFactory repository was not verified or mutated,
    and no cross-repository sync is claimed.
- Blockers: none for `P47-040-service`.
- Newly ready nodes:
  - `P47-040-service`;
  - `P47-060-data-inventory` remains independently ready and must verify county
    operational sources before those rules can be promoted.

## 2026-08-29T09:36:58Z - Phase 47 intelligence service boundary

- Requested task: continue autonomous engine delivery for real users without
  mock providers or fabricated results, while keeping workflow and handoff
  truth in the repository.
- Graph node: `P47-040-service`.
- Repository: `AyobamiH/tax-lien-intelligence-platform`.
- Branch and starting commit:
  `feature/intelligence-engine-foundation` at `2c44a63`.
- Runtime decision:
  - used Python 3.12 standard library only because the current environment and
    repository had no FastAPI, Uvicorn, pytest, HTTPX, or JSON Schema runtime;
  - did not install or invent a provider dependency;
  - kept the process stateless and internal, with the TypeScript application
    remaining the future tenant-aware system of record.
- Work completed:
  - added `services/intelligence` with Python package metadata, service source,
    unit tests, operator README, and a non-root Dockerfile;
  - implemented dependency-free `CandidateEvidenceV1` validation, including
    versions, strict keys, canonical timestamps, field states, typed values,
    provenance references, source identifiers, money, and limitations;
  - implemented independent `EngineResultV1` output validation so invalid
    internal output is refused before HTTP serialization;
  - ported exact-scope Maricopa deterministic rule evaluation with assessed,
    insufficient-evidence, and out-of-scope results, deterministic coverage,
    source-retaining exclusions, and unavailable redemption probability;
  - exposed `GET /health`, `GET /version`, and authenticated
    `POST /v1/evaluate`;
  - added constant-time bearer-token checks, 32-character minimum secret
    requirement, loopback-only explicit insecure mode, a 1 MiB default body
    limit, content-type and length validation, a 10-second socket read timeout,
    structured no-store responses, safe errors, and graceful shutdown;
  - ensured error responses close the connection after the real-process suite
    exposed unread-body corruption across an HTTP keep-alive connection;
  - changed evidence digest canonicalization to tagged UTF-8 hex and big-endian
    IEEE-754 number encoding so JavaScript and Python produce the same digest
    for fractional values and Unicode-safe content;
  - added a version manifest that exposes active contracts, rule pack, dated
    statutory sources, unverified county-operation status, and an empty model
    artifact registry;
  - integrated Python 3.12 setup, compile, unit tests, and the real-process smoke
    into repository scripts and CI.
- Tests added:
  - 10 Python unit tests for evidence/result contracts, abstention, scope,
    digest stability, no-value unavailable signals, and version truth;
  - 7 Vitest real-process tests that start Python on an ephemeral loopback
    port and verify health/version, authentication, content type, body size,
    malformed JSON, complete TypeScript/Python parity, invalid evidence, and
    out-of-scope behavior.
- Checks run:
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run validate:work-graph` passed with 10 nodes;
  - `npm run typecheck` passed;
  - `npm run test` passed with 10 Python unit tests plus 43 Vitest files and
    296 Vitest tests;
  - `npm run build` passed for every TypeScript workspace and Python compile;
  - `npm run smoke:intelligence-service` passed with 1 real-process file and 7
    HTTP tests;
  - `git diff --check` passed.
- Documentation updated:
  - `docs/api/intelligence-service.md`;
  - `docs/architecture/intelligence-service.md`;
  - `docs/engine/rule-packs.md`;
  - `docs/engine/status.md`;
  - `docs/engine/work-graph.json`;
  - `docs/engine/phase-47-plan.md`;
  - `docs/kb/backend-direction-kb.md`;
  - `docs/kb/repo-reality-kb.md`;
  - `ACCEPTANCE.md`, `OPENCLAW_RUNBOOK.md`, `README.md`, `.env.example`, CI,
    changelog, and this ledger.
- Verified limits:
  - the platform API does not call the service yet, so no user workflow is
    switched in this node;
  - no database persistence, tenant authorization, retry/idempotency store,
    service-mesh transport, load test, failover, deployment, or production
    traffic is claimed;
  - the container definition was not built or deployed in this environment;
  - no current county auction feed, county operational rules, model artifact,
    calibrated probability, AVM, liquidity prediction, or ChatGPT tool exists;
  - the internal bearer token authenticates the calling service, not an end
    user;
  - the external OneClickPostFactory repository was not verified or mutated,
    and no cross-repository sync is claimed.
- Blockers: none for `P47-050-platform-integration`.
- Newly ready nodes:
  - `P47-050-platform-integration`;
  - `P47-060-data-inventory` remains independently ready.

## 2026-08-29 - Phase 47 ChatGPT MCP implementation checkpoint

- Requested task: continue autonomously toward a real-user ChatGPT interface,
  keep work graph governed and self-documenting, and ship no mock production
  intelligence.
- Graph node: `P47-090-chatgpt-interface`, `in_progress`.
- Repository: `AyobamiH/tax-lien-intelligence-platform`.
- Branch and starting commit:
  `feature/intelligence-engine-foundation` at
  `1974bc8b1e7274deb12d2324a7a903e1765b437d`.
- Work completed:
  - installed the official TypeScript MCP SDK in the API workspace;
  - added authenticated stateless MCP Streamable HTTP at `POST /mcp`;
  - added six read-only tools for workspace discovery, dataset review, bounded
    candidate pages, candidate evidence, no-ranking comparison, and
    privacy-reduced decision briefs;
  - resolved workspace membership from the authenticated principal before
    tenant lookup and accepted no caller-supplied tenant id;
  - added a direct tenant-owned scored-record read method for evidence tools;
  - separated stored normalized facts, fixed-rule legacy inferences, versioned
    intelligence, unknowns, and source-row citations;
  - kept redemption legacy output explicitly labeled
    `heuristic_not_probability`;
  - excluded user emails, member lists, comments, free-form notes, approval
    notes, raw rows, access tokens, and exported brief prose;
  - added optional `MCP_APP_BASE_URL` links with production HTTPS enforcement;
  - exposed no write, approval, bid, purchase, external action, or score
    calculation tool.
- Tests added:
  - MCP bearer authentication and structured response tests;
  - exact read-only tool inventory and annotation tests;
  - invalid input bounds and authenticated-principal binding tests;
  - tenant resolution and denied workspace tests;
  - evidence classification, citation, abstention, and no-ranking tests;
  - adversarial prompt-like source-label handling as inert cited data.
- Checks run:
  - `npm run audit` passed with 0 vulnerabilities;
  - `npm run validate:data-inventory` passed with 6 sources, 0 approved, 4
    blocked, and training blocked;
  - `npm run validate:work-graph` passed with 11 nodes and 1 in progress;
  - `npm run typecheck` passed;
  - focused MCP tests passed with 2 files and 9 tests;
  - `npm run test` passed with 10 Python tests and 315 Vitest tests across 48
    files;
  - `npm run build` passed for all TypeScript workspaces and Python compile;
  - `npm run smoke:local` passed;
  - `npm run smoke:browser` passed with 3 files and 6 tests;
  - `npm run smoke:intelligence-service` passed with 1 real-process file and 9
    tests.
- Documentation updated:
  - MCP API and architecture references;
  - tool contract and privacy/safety review;
  - engine operating guide, plan, status, graph, and docs index;
  - repo and security KB truth;
  - acceptance, runbook, README, environment example, changelog, and this
    ledger.
- Verified limits:
  - the interface uses the current application bearer JWT for internal
    validation and does not claim a public ChatGPT OAuth flow;
  - no stable public HTTPS deployment, ChatGPT connection, production traffic,
    load, failover, rollback, or user-outcome improvement is claimed;
  - candidate list pagination currently bounds the response after a tenant
    dataset score read; storage-level cursor pagination is future scale work;
  - no current county verification, title condition, live lien status,
    redemption event, auction eligibility, trained model artifact, calibrated
    probability, legal conclusion, or bid recommendation is claimed;
  - deterministic test fixtures isolate behavior and are not production
    intelligence or model evidence.
- Publication status: pending implementation commit, remote ref verification,
  and independent branch CI. The node remains `in_progress` until those pass.
- Next safe step: publish this checkpoint, verify branch CI including real
  MongoDB persistence, then record a small graph and ledger closure commit.
