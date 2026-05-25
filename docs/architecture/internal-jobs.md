# Internal Job Architecture

Phase 8 introduces automation-ready job plumbing. It does not introduce
automation, cron, external queue infrastructure, alerts, or background workers.

The purpose is to move repeatable operations toward explicit, persisted,
testable execution boundaries before future automation is added.

## Current Implementation

Implemented:

- tenant-owned `InternalJob` Mongo model;
- internal job store and service in `apps/api/src/jobs`;
- authenticated `GET /jobs/:jobId` route;
- `dataset_scoring` job type;
- `dataset` target entity type;
- queued/running/completed/failed lifecycle;
- safe summary metadata;
- safe error metadata;
- dataset scoring routed through the job execution service;
- frontend scoring success message that exposes the completed job id/status;
- integration and unit tests for lifecycle, success, failure, and cross-user
  job access.

Not implemented:

- external scheduler;
- cron automation;
- worker process;
- third-party queue infrastructure;
- retries;
- alerting;
- enrichment integrations;
- ML/AI;
- auction execution.

## Job Model

The job model stores:

- `userId`;
- job type;
- target entity type;
- target entity id;
- status;
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
2. mark job `running`;
3. run the domain action;
4. mark job `completed` with a safe summary; or
5. mark job `failed` with safe error metadata and rethrow the original error to
   preserve API behavior.

The first implementation runs in-process. The lifecycle shape is intentionally
compatible with future background execution.

## First Job-Backed Action

Dataset scoring now creates a `dataset_scoring` job for the owned dataset before
running score generation.

The scoring route still returns scored records synchronously so the current
review UX is not degraded. The response now also includes job metadata.

## Service Boundaries

The current boundary is:

- route layer: auth and HTTP shape;
- scoring service: ownership validation and domain orchestration;
- internal job service: lifecycle persistence;
- scoring package: pure scoring rules;
- scored-record store: score persistence.

Future automation should reuse the job service rather than adding hidden work to
route handlers.

## Security Considerations

Job records must not expose raw payloads, source files, stack traces, secrets,
or another tenant's identifiers.

Current protections:

- authenticated job detail route;
- `userId` scoped job lookups;
- cross-user job access tests;
- safe API errors for inaccessible jobs;
- safe stored error metadata.

Future protections needed before external automation:

- retry policy;
- idempotency rules;
- rate limits;
- job logs or audit entries that avoid raw sensitive data;
- worker authorization model if jobs move out of process.

## Drift Controls

Do not:

- add cron or schedulers through route handlers;
- store arbitrary client payloads in jobs;
- expose raw job internals to the browser;
- treat jobs as automation by themselves;
- add retries without idempotency and test coverage.

## Update Rules

Update this document when:

- new job types are added;
- job status values change;
- jobs move out of process;
- retry or scheduling behavior is introduced;
- job API response contracts change.
