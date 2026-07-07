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
- Crabbox is used for verification or a capability-gap result is recorded after
  repo/workspace-local diagnosis;
- `WORK_LEDGER.md` records the run with evidence, checks, and next step;
- at least the relevant documentation/code sanity checks are run;
- when the operator has explicitly authorized commit/push for this run, the
  verified patch is committed and pushed after checks pass.

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
- `npm run audit` for dependency/security-sensitive changes.

## Unverified After This Run

The following are not proven by static inspection alone:

- browser-driver screenshots or interactive browser smoke tests;
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
