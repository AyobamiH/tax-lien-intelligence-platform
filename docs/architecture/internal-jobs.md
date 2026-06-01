# Internal Job Architecture

Phase 8 introduced automation-ready job plumbing. Phase 9 added in-app alerts
from selected job outcomes. Phase 10 adds a dedicated local worker execution
boundary and minimal scheduler foundation. Phase 14 adds controlled dataset
refresh/reprocessing requests that reuse the same job boundary. The job layer
still does not
introduce product automation, external queue infrastructure, email/SMS delivery,
external schedulers, ML/AI, or auction execution.

The purpose is to move repeatable operations toward explicit, persisted,
testable execution boundaries before future automation is added.

## Current Implementation

Implemented:

- tenant-owned `InternalJob` Mongo model;
- internal job store and service in `apps/api/src/jobs`;
- authenticated `GET /jobs/:jobId` route;
- `dataset_scoring` job type;
- `dataset` target entity type;
- request kind metadata: `score` or `refresh`;
- queued/running/completed/failed lifecycle;
- duplicate-safe active job lookup for dataset refresh requests;
- safe summary metadata;
- safe error metadata;
- dataset scoring routed through the job execution service;
- alert creation for completed/failed dataset scoring jobs;
- worker-side job claiming for queued jobs;
- dedicated worker entrypoint at `apps/api/src/worker.ts`;
- minimal in-process scheduler module in `apps/api/src/scheduler`;
- frontend polling of the score job status after a scoring request;
- integration and unit tests for lifecycle, success, failure, and cross-user
  job access.

Not implemented:

- cron automation;
- third-party queue infrastructure;
- retries;
- external alert delivery;
- additional worker job types for enrichment-only passes;
- ML/AI;
- auction execution.

## Job Model

The job model stores:

- `userId`;
- job type;
- target entity type;
- target entity id;
- status;
- request kind;
- summary metadata;
- safe error metadata;
- queued timestamp;
- optional started/completed/failed timestamps;
- created/updated timestamps.

Job records are user-owned when linked to user-owned actions. They are not
global public operational logs.

## Lifecycle

Current lifecycle:

1. create job as `queued`;
2. worker atomically claims the next queued job and marks it `running`;
3. worker runs the domain action;
4. mark job `completed` with a safe summary; or
5. mark job `failed` with safe error metadata.

The first worker implementation is still simple: it polls MongoDB for queued
jobs and executes supported work in-process inside the worker runtime. This is
not a distributed queue or managed scheduler, but it creates the execution
boundary future automation can reuse.

## First Job-Backed Action

Dataset scoring now creates a `dataset_scoring` job for the owned dataset and
returns queued job metadata. The dedicated worker claims the job, generates
scores, records completion/failure, stores enrichment counts/reprocess timing in
the safe job summary, and emits safe in-app alerts.

Phase 14 refresh requests use the same job type with `requestKind: "refresh"`.
When a dataset already has a queued/running scoring job, refresh returns the
active job instead of creating duplicate work.

The frontend keeps the review UX understandable by polling `GET /jobs/:jobId`
and fetching scores after the worker marks the job completed.

## Service Boundaries

The current boundary is:

- route layer: auth and HTTP shape;
- scoring service: ownership validation and domain orchestration;
- internal job service: lifecycle persistence;
- worker processor: claiming and executing supported queued jobs;
- scheduler module: local timed task registration and polling loop;
- scoring package: pure scoring rules;
- scored-record store: score persistence.

Future automation should reuse the job service rather than adding hidden work to
route handlers. Future visibility events should use the alert service rather
than exposing raw job internals directly.

## Security Considerations

Job records must not expose raw payloads, source files, stack traces, secrets,
or another tenant's identifiers.

Current protections:

- authenticated job detail route;
- `userId` scoped job lookups;
- cross-user job access tests;
- safe API errors for inaccessible jobs;
- safe stored error metadata.
- duplicate-safe refresh job reuse while a dataset job is queued or running.

Future protections needed before external automation:

- retry policy;
- idempotency rules;
- rate limits;
- job logs or audit entries that avoid raw sensitive data;
- worker authorization model for deployed worker runtimes.

## Drift Controls

Do not:

- add cron or schedulers through route handlers;
- store arbitrary client payloads in jobs;
- expose raw job internals to the browser;
- treat jobs as automation by themselves;
- add retries without idempotency and test coverage.
- add new worker job types without ownership and stale-reference tests.
- create refresh loops or duplicate dataset jobs from repeated button clicks.

## Update Rules

Update this document when:

- new job types are added;
- job status values change;
- jobs move out of process;
- retry or scheduling behavior is introduced;
- job API response contracts change.
