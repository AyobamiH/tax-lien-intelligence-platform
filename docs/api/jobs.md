# Internal Jobs API

Phase 8 introduces automation-ready internal job records. Jobs make repeatable
or long-running operations explicit without adding external schedulers or
background-worker infrastructure yet.

Current job usage:

- dataset scoring creates and executes a `dataset_scoring` job in-process.

Automation itself is not implemented. Jobs are the foundation future automation
will plug into.

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

The first implementation executes jobs synchronously in-process, so a successful
scoring request normally returns a completed job. The status model exists so
future background workers can use the same record shape.

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
    "status": "completed",
    "summary": {
      "scoredRecordCount": 2
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

There is no external queue, cron scheduler, worker fleet, retry policy, alerting,
or automation trigger yet. The job record is persisted and lifecycle-aware, but
the first job-backed action still executes inside the request lifecycle.
