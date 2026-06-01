# Internal Jobs API

Phase 8 introduced automation-ready internal job records. Phase 10 adds the
first dedicated worker execution path. Phase 15 adds scheduled maintenance job
groundwork for stale dataset refresh eligibility. Jobs make repeatable or
long-running operations explicit without adding external schedulers, third-party
queues, or full automation.

Current job usage:

- dataset scoring creates a queued `dataset_scoring` job.
- dataset refresh creates or reuses a queued/running `dataset_scoring` job with
  `requestKind: "refresh"`.
- scheduled maintenance scans create `dataset_maintenance` jobs with
  `requestKind: "maintenance_scan"` for stale datasets when policy and duplicate
  guards allow inspection.
- eligible maintenance jobs may create a follow-on `dataset_scoring` job with
  `requestKind: "policy_refresh"`.
- the background worker claims and executes queued scoring jobs.
- the background worker can claim maintenance jobs and apply refresh policy.
- completed or failed scoring jobs now create safe in-app alerts.

Broad product automation itself is not implemented. Jobs, the worker foundation,
and scheduled maintenance policy gates are the execution boundary future
automation will plug into.

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
- `refresh` for controlled Phase 14 refresh/reprocessing requests;
- `maintenance_scan` for Phase 15 scheduler-created maintenance jobs;
- `policy_refresh` for Phase 15 maintenance-policy-created refresh jobs.

## Job Types

Supported job types:

- `dataset_scoring`
- `dataset_maintenance`

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

Maintenance jobs use the same envelope with a safe maintenance summary:

```json
{
  "job": {
    "id": "maintenance-job-id",
    "type": "dataset_maintenance",
    "targetEntityType": "dataset",
    "targetEntityId": "dataset-id",
    "requestKind": "maintenance_scan",
    "status": "completed",
    "summary": {
      "maintenanceScannedDatasetCount": 1,
      "maintenanceStaleDatasetCount": 1,
      "maintenanceRefreshJobCount": 1,
      "maintenanceSkippedDatasetCount": 0,
      "maintenanceDecision": "policy_refresh_queued",
      "maintenanceRunAt": "2026-06-01T00:00:00.000Z",
      "staleRecordCount": 3,
      "refreshJobId": "policy-refresh-job-id",
      "policyAutoRefreshEnabled": true
    }
  }
}
```

Maintenance decisions are safe user-visible control states:

- `not_stale`
- `manual_refresh_only`
- `policy_refresh_queued`
- `active_refresh_exists`
- `recent_refresh_suppressed`
- `recent_failure_suppressed`

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
delivery channel, unlimited autonomous refresh, or broad external sync trigger
yet. The job record is persisted and lifecycle-aware, `dataset_scoring` and
`dataset_maintenance` execute through the dedicated worker path, Phase 14
refresh requests are duplicate-safe wrappers around scoring, and Phase 15
scheduled maintenance only queues policy refreshes when explicit server policy
allows it.
