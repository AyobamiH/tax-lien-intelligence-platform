# Internal Jobs API

Phase 8 introduced automation-ready internal job records. Phase 10 adds the
first dedicated worker execution path. Jobs make repeatable or long-running
operations explicit without adding external schedulers, third-party queues, or
full automation.

Current job usage:

- dataset scoring creates a queued `dataset_scoring` job.
- dataset refresh creates or reuses a queued/running `dataset_scoring` job with
  `requestKind: "refresh"`.
- the background worker claims and executes queued scoring jobs.
- completed or failed scoring jobs now create safe in-app alerts.

Automation itself is not implemented. Jobs and the worker foundation are the
execution boundary future automation will plug into.

## Security Model

- Job detail routes require `Authorization: Bearer <jwt-access-token>`.
- Job records are scoped by `userId`.
- The client never sends `userId`.
- Cross-user job reads return safe not-found errors.
- Job errors expose stable safe codes/messages, not raw internals.
- Job summaries are intentionally small and user-safe.

## Job Statuses

Supported statuses:

- `queued`
- `running`
- `completed`
- `failed`

Scoring requests now return queued job metadata. The worker moves jobs through
`running` into `completed` or `failed`.

Jobs also carry a request kind:

- `score` for first scoring and normal re-run requests;
- `refresh` for controlled Phase 14 refresh/reprocessing requests.

## Job Types

Supported job types:

- `dataset_scoring`

Supported target entity types:

- `dataset`

## `GET /jobs/:jobId`

Returns one job owned by the authenticated user.

### Response `200`

```json
{
  "job": {
    "id": "job-id",
    "type": "dataset_scoring",
    "targetEntityType": "dataset",
    "targetEntityId": "dataset-id",
    "requestKind": "refresh",
    "status": "completed",
    "summary": {
      "scoredRecordCount": 2,
      "enrichedRecordCount": 2,
      "enrichmentFallbackCount": 0,
      "earliestReprocessAfter": "2026-06-24T00:00:00.000Z"
    },
    "queuedAt": "2026-05-25T00:00:00.000Z",
    "startedAt": "2026-05-25T00:00:00.000Z",
    "completedAt": "2026-05-25T00:00:00.000Z",
    "createdAt": "2026-05-25T00:00:00.000Z",
    "updatedAt": "2026-05-25T00:00:00.000Z"
  }
}
```

### Failed Job Shape

```json
{
  "job": {
    "id": "job-id",
    "type": "dataset_scoring",
    "targetEntityType": "dataset",
    "targetEntityId": "dataset-id",
    "requestKind": "refresh",
    "status": "failed",
    "error": {
      "code": "score_no_source_rows",
      "message": "Dataset does not contain scoreable source rows."
    }
  }
}
```

## Job Error Codes

Possible job errors:

- `auth_missing_token`
- `auth_invalid_header`
- `auth_invalid_token`
- `job_invalid_id`
- `job_not_found`
- `job_lifecycle_failed`

Job `error.code` may also contain the safe domain error that caused the job to
fail, such as `score_no_source_rows`.

## Current Limitation

There is no external queue, cron provider, worker fleet, retry policy, alert
delivery channel, or autonomous automation trigger yet. The job record is
persisted and lifecycle-aware, `dataset_scoring` executes through the dedicated
worker path, and Phase 14 refresh requests are duplicate-safe wrappers around
that same execution boundary.
