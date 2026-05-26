# Worker And Scheduler Foundation

## Scope

Phase 10 introduces the first background execution boundary for the platform.
It moves dataset scoring from request-time execution to a worker-claimed job
path while keeping automation deliberately narrow.

This is groundwork. It is not an external automation product, distributed queue,
cron platform, enrichment adapter, email/SMS delivery system, ML system,
collaboration workflow, or auction execution layer.

## Current Implementation

Implemented:

- dedicated worker entrypoint at `apps/api/src/worker.ts`;
- worker processor in `apps/api/src/worker`;
- minimal scheduler in `apps/api/src/scheduler`;
- queued-job claiming through the internal job store;
- `dataset_scoring` execution in the worker path;
- safe completion/failure recording through the internal job service;
- existing scoring completion/failure alerts preserved;
- frontend score status polling after the scoring trigger returns a queued job;
- unit tests for job claiming and scheduler behavior;
- integration tests for worker-driven scoring success, failure, and stale
  target handling.

Not implemented:

- external scheduler or cron provider;
- third-party queue infrastructure;
- durable retry policy;
- worker fleet coordination;
- email/SMS/realtime delivery;
- enrichment adapters;
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
2. API verifies dataset ownership and creates a queued job;
3. API returns `202` with queued job metadata;
4. worker claims the job;
5. worker validates the job target and ownership context;
6. worker generates scored records from stored dataset source rows;
7. worker marks the job completed or failed;
8. alert service creates a safe in-app alert for the outcome.

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

This scheduler is not a cloud scheduler and should not be treated as durable
automation. Future scheduled product behavior needs deployment planning,
idempotency, visibility, and failure policy before launch.

## Security Notes

Worker execution is a trusted backend boundary.

Rules:

- workers must execute only persisted job types the backend understands;
- user ownership must remain attached to user-owned jobs;
- job errors must remain safe and stable;
- raw CSV rows, stack traces, secrets, and another tenant's identifiers must not
  be exposed through job responses or alerts;
- invalid or stale job targets must fail safely.

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

## Update Rules

Update this document when:

- new worker job types are added;
- scheduler behavior changes;
- worker deployment assumptions change;
- retries or reruns are implemented;
- job execution moves to external queue infrastructure.
