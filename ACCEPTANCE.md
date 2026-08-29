# Acceptance

## Current Product-State Acceptance

The current product state is acceptable only when these claims remain true:

- `main` is the source-of-truth branch for local work.
- The npm workspace scripts exist for `audit`, `typecheck`, `test`, and
  `build`.
- Auth and selected-workspace tenancy are enforced server-side.
- Dataset upload, import detection, readiness validation, manual mapping,
  import profiles, scoring, and scored-record review have API and browser
  support.
- Watchlist, portfolio, comparison, approval, checklist, decision brief, final
  outcome, and outcome review workflows are represented in code and tests.
- Follow-up reminders include bounded completion and snooze/reschedule controls
  with scheduler suppression/deferral behavior covered by tests.
- Follow-up lifecycle controls have repeatable browser-like smoke proof for
  due-state rendering, update, complete, and snooze/reschedule behavior.
- Notification, comment, assignment, follow, activity, and my-work surfaces do
  not leak private workspace content across tenants.
- Expensive scoring and refresh request paths have bounded abuse protection.
- The fixed-window request limiter has focused coverage for `429` response
  details, route independence, hook invocation, and reset-window behavior.
- Docs distinguish implemented capability from future direction.

## Current Run Acceptance

This autonomous run is complete when:

- the real repo path is verified;
- branch, remotes, HEAD, scripts, docs, tests, CI, routes, models, jobs, and
  KB/control files are inspected;
- project-control files exist and are updated without replacing existing repo
  truth;
- any documentation drift found during inspection is corrected narrowly;
- the current security/product-hardening patch is verified or strengthened
  within local code/tests/docs;
- Phase 45 follow-up completion/snooze control is implemented without adding a
  task-management, calendar, recurrence, SLA, or AI scheduling layer;
- completed follow-ups are no longer active queue/reminder candidates, and
  snoozed follow-ups reset reminder state against the new due date;
- Phase 46 browser-like smoke proof exercises the real React shell with local
  synthetic data and records bounded evidence for due-state, completion, and
  snooze behavior;
- Crabbox is used for verification or a capability-gap result is recorded after
  repo/workspace-local diagnosis;
- `WORK_LEDGER.md` records the run with evidence, checks, and next step;
- at least the relevant documentation/code sanity checks are run;
- when the operator has explicitly authorized commit/push for this run, the
  verified patch is committed and pushed after checks pass.

## Phase 47 Intelligence-Engine Acceptance

Phase 47 work is acceptable only when:

- `docs/engine/work-graph.json` passes `npm run validate:work-graph`;
- `executionFocus` names one next node, allows at most one ready or in-progress
  node, preserves a truthful blocked state, and prevents deferred work from
  becoming runnable;
- `docs/engine/data-source-inventory.json` passes
  `npm run validate:data-inventory`;
- graph dependencies and ownership make agent handoff unambiguous;
- every engine result carries contract, engine, rule-pack, and evidence
  versions plus field-level provenance;
- unsupported inputs return `insufficient_evidence` or `out_of_scope` instead
  of a fabricated prediction;
- the existing rules prototype is labelled as a heuristic and is not presented
  as a calibrated redemption probability;
- no language model calculates, changes, or invents deterministic engine
  values;
- model-backed probability fields remain unavailable until historical outcome
  data, temporal validation, calibration, and model-artifact provenance are
  verified;
- no public page, download, or query service is approved for production or
  model training without verified authority, schema, cadence, observation
  time, permitted commercial use, and provenance;
- model training requires dated certificate outcomes and censoring fields, and
  an absent event is never treated as a negative outcome without a verified
  observation end;
- TypeScript compatibility remains explicit while the intelligence service
  boundary is introduced;
- the Python service rejects unauthenticated, oversized, malformed, and
  contract-invalid evaluation requests before rule execution;
- Python and TypeScript contract, rule, and evidence-digest parity is exercised
  through a real loopback service process;
- the tenant-aware API client validates result identity and digest before
  persistence and never substitutes stale intelligence after a failed call;
- legacy redemption output is labelled as a fixed-rule heuristic in API
  metadata and browser surfaces;
- completed, not-configured, failed, insufficient-evidence, and out-of-scope
  states remain distinguishable to users;
- ChatGPT tools are read-only, resolve workspace membership server-side, and
  never accept a caller-supplied tenant id;
- ChatGPT candidate output separates cited stored facts, fixed-rule inferences,
  versioned engine results, and explicit unknowns;
- no ChatGPT tool writes product state, changes an engine value, calculates a
  bid, executes a purchase, or presents legacy redemption output as a
  probability;
- public ChatGPT readiness is not claimed before OAuth, stable HTTPS,
  production observability, live authorization tests, and release evidence;
- implementation, tests, docs, changelog, graph state, and `WORK_LEDGER.md`
  change together for every completed node;
- no node is considered complete before checks pass and the commit is pushed.

## ChatGPT Priority-One Acceptance

The ChatGPT product release train is acceptable only when:

- one primary user segment, the triage, diligence, and decision-brief jobs, and
  the evidence-first promise are explicit;
- `P47-092`, `P47-093`, `P47-094`, and `P47-095` run in order, with no parallel
  data, model, county, web-app, billing, or marketing track;
- the existing platform remains the engine, tenant authority, evidence store,
  and system of record;
- any separate ChatGPT release repository is a thin consumer with pinned
  interface provenance and no copied scoring, evidence, auth, or write logic;
- the private connection uses a real stable HTTPS service and approved OAuth;
  a local response, mock connector, or manual application JWT is insufficient;
- real-user pilot evidence includes at least five distinct target users, ten
  real tasks, and thirty scripted safety/grounding scenarios;
- all critical authorization and tenant-isolation cases pass, and the product
  emits no uncited numeric, legal, bid, or purchase conclusion;
- public claims, privacy, retention, deletion, support, incident response,
  monitoring, and rollback match verified behavior before release;
- deferred engine work resumes only when pilot evidence identifies it as the
  highest-impact blocker or after public release is complete.

## Evidence That Counts

Completion evidence may include:

- direct git and filesystem inspection output;
- package scripts and CI workflow reads;
- source route/model/job/test inspection;
- successful `git diff --check`;
- successful `npm run typecheck`;
- successful `npm run test`;
- successful `npm run build`;
- successful `npm run smoke:local`;
- successful `npm run smoke:browser`;
- successful `npm run smoke:follow-ups:browser`;
- successful `npm run smoke:intelligence-service`;
- successful `npm run smoke:intelligence:mongo` in an environment with a real
  MongoDB service;
- successful `npm run audit`;
- focused test output when a narrow code path changes.

## Required Checks Before Claiming Done

For documentation-only changes:

- `git diff --check`;
- `npm run typecheck`;
- run broader tests/build when time permits or when docs claim runtime behavior.

For source changes:

- `git diff --check`;
- `npm run typecheck`;
- relevant unit/integration tests;
- `npm run test`;
- `npm run build`;
- `npm run smoke:local` when runtime/API/browser-shell behavior is in scope;
- `npm run smoke:browser` when browser render/bootstrap behavior is in scope;
- `npm run smoke:follow-ups:browser` when follow-up UI lifecycle proof is in
  scope;
- `npm run audit` for dependency/security-sensitive changes.

## Unverified After This Run

The following are not proven by static inspection alone:

- browser-driver screenshots or interactive browser smoke tests beyond the
  local jsdom browser-like smoke;
- MongoDB-backed end-to-end flows outside automated tests;
- production deployment posture;
- production deployment behavior, secret rotation, and external worker
  isolation;
- distributed or persisted rate limiting for multi-instance deployments;
- broad county import coverage beyond the implemented adapter/fallback.

## Security And Tenancy Requirements

- Do not read `.env`, credential stores, tokens, service keys, or secret-bearing
  files without explicit approval.
- Do not trust client-supplied user or workspace ownership.
- Preserve selected-workspace membership checks for shared resources.
- Avoid exposing comment text, rationale, raw row content, or arbitrary payloads
  in alerts, deliveries, or activity metadata.
- Keep provider-backed email disabled unless required env configuration is
  present.
- Treat production deployment, migrations, service restarts, dependency
  changes, releases, and production config mutation as approval-bound.
- Commit/push and repo/workspace-local Crabbox repair may proceed only when the
  current operator request explicitly authorizes them and checks pass.
