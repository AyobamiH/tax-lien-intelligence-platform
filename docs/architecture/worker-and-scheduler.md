# Worker And Scheduler Foundation

## Scope

Phase 10 introduces the first background execution boundary for the platform.
It moves dataset scoring from request-time execution to a worker-claimed job
path while keeping automation deliberately narrow. Phase 14 adds a controlled
refresh request path that reuses worker-claimed dataset scoring jobs rather than
creating autonomous refresh automation. Phase 15 adds a scheduled maintenance
task that can detect stale scored datasets and queue policy-gated maintenance
jobs.

This is groundwork. It is not an external automation product, distributed queue,
cron platform, email/SMS delivery system, ML system, collaboration workflow, or
auction execution layer.

## Current Implementation

Implemented:

- dedicated worker entrypoint at `apps/api/src/worker.ts`;
- worker processor in `apps/api/src/worker`;
- minimal scheduler in `apps/api/src/scheduler`;
- queued-job claiming through the internal job store;
- `dataset_scoring` execution in the worker path;
- `dataset_maintenance` execution in the worker path;
- safe completion/failure recording through the internal job service;
- existing scoring completion/failure alerts preserved;
- Phase 11/12/13 enrichment runs inside the scoring job before score generation
  and records safe enrichment summary/reprocess metadata;
- Phase 14 refresh requests create or reuse `dataset_scoring` jobs with
  `requestKind: "refresh"`;
- Phase 15 maintenance scans create `dataset_maintenance` jobs with
  `requestKind: "maintenance_scan"`;
- maintenance jobs may create `dataset_scoring` jobs with
  `requestKind: "policy_refresh"` only when server policy allows it;
- duplicate guards suppress active scoring/maintenance work, recent maintenance
  runs, recent policy refreshes, and recent policy refresh failures;
- frontend score status polling after the scoring trigger returns a queued job;
- unit tests for job claiming and scheduler behavior;
- integration tests for worker-driven scoring success, failure, and stale
  target handling.

Not implemented:

- external scheduler or cron provider;
- third-party queue infrastructure;
- durable retry policy;
- unlimited autonomous refresh;
- user-facing scheduler configuration UI;
- worker fleet coordination;
- email/SMS/realtime delivery;
- additional external enrichment providers beyond the opt-in Census Geocoder
  adapter;
- ML/AI;
- auction execution.

## Worker Runtime

The worker connects to MongoDB, creates the same trusted service graph used by
the API, and polls for queued internal jobs.

Local commands:

- `npm run dev:worker` from the repo root starts the API worker in watch mode.
- `npm run worker -w @tax-lien/api` runs the compiled API worker.

The worker also supports a single-run mode through `apps/api/src/worker.ts`
with `--once`, which is useful for local diagnostics after build output exists.

## Job Claiming

Job claiming is intentionally minimal and bounded:

1. find the oldest queued job;
2. atomically mark it `running`;
3. set `startedAt`;
4. clear stale terminal metadata;
5. execute only supported job types;
6. mark completion or failure with safe metadata.

The Mongo store uses a status-constrained update so two worker loops cannot
claim the same queued job through the normal path.

## First Worker-Driven Job

The first worker-driven job is `dataset_scoring`.

Flow:

1. authenticated user calls `POST /datasets/:datasetId/score`;
   or `POST /datasets/:datasetId/refresh`;
2. API verifies dataset ownership and creates a queued job;
3. API returns `202` with queued job metadata;
4. worker claims the job;
5. worker validates the job target and ownership context;
6. worker normalizes and enriches stored dataset source rows;
7. worker generates scored records;
8. worker marks the job completed or failed;
9. alert service creates a safe in-app alert for the outcome.

## First Scheduler-Driven Maintenance Task

Phase 15 registers `dataset-maintenance-scan` in the worker scheduler. The task
uses scored-record freshness metadata to find stale datasets up to the configured
per-run cap. For each stale dataset, it queues a `dataset_maintenance` job only
when there is no active maintenance job, no active scoring/refresh job, and no
recent maintenance run inside the configured suppression windows.

The maintenance job then:

1. verifies the dataset still belongs to the job user;
2. counts currently stale scored records;
3. checks active dataset scoring jobs;
4. checks recent policy refresh completion/failure timing;
5. applies the server policy mode;
6. either records a safe skip decision or queues a `policy_refresh` scoring job.

This is policy-driven maintenance groundwork, not broad autonomous sync. The
default policy is manual-only unless `MAINTENANCE_AUTO_REFRESH_ENABLED=true`.

The client never sends trusted score values or job ownership fields.

## Scheduler Foundation

The scheduler is a small internal module for registering timed local tasks. In
Phase 10 it is used to poll for queued jobs. It supports:

- task registration by stable id;
- interval-based due checks;
- optional immediate first run;
- duplicate registration rejection;
- basic in-process overlap prevention for the same task;
- safe failed-task results.
- a registered maintenance scan task when the worker process is running.

This scheduler is not a cloud scheduler and should not be treated as durable
automation. Phase 15 uses it for bounded maintenance scans in the worker runtime.
Future scheduled product behavior still needs deployment planning, idempotency,
visibility, rate limits, rollout controls, and failure policy before launch.

## Security Notes

Worker execution is a trusted backend boundary.

Rules:

- workers must execute only persisted job types the backend understands;
- user ownership must remain attached to user-owned jobs;
- job errors must remain safe and stable;
- raw CSV rows, stack traces, secrets, and another tenant's identifiers must not
  be exposed through job responses or alerts;
- invalid or stale job targets must fail safely.
- maintenance decisions must be safe summaries, not raw scheduler internals;
- policy-created refresh jobs must be distinguishable from manual refresh jobs.

Future deployed workers will need explicit environment and service credentials
review. Phase 10 does not introduce separate worker credentials.

## Drift Controls

Do not:

- add product automation just because the worker exists;
- add external cron or queue infrastructure without a separate phase;
- run scoring in request handlers again;
- add retries without idempotency tests;
- expose raw worker logs to the browser;
- create job types without ownership, stale-reference, and failure-path tests.
- turn maintenance scans into unlimited refresh loops.

## Update Rules

Update this document when:

- new worker job types are added;
- scheduler behavior changes;
- worker deployment assumptions change;
- retries or reruns are implemented;
- job execution moves to external queue infrastructure.
