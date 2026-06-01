# Alerts API

Phase 9 introduces tenant-owned in-app alerts for important user-visible
workflow events. Alerts are a monitoring surface inside the app, not email,
SMS, realtime delivery, or external automation.

Current alert sources:

- dataset scoring job completed;
- dataset scoring job failed.
- dataset refresh job completed or failed through the same scoring job alert
  types, with `requestKind: "refresh"` metadata.

## Security Model

- Alert routes require `Authorization: Bearer <jwt-access-token>`.
- Alert ownership is derived from the authenticated token.
- The client never sends `userId`.
- Cross-user alert access returns safe not-found errors.
- Alert metadata is intentionally small and safe for browser rendering.
- Alert messages must not include stack traces, raw job internals, uploaded row
  data, secrets, or another tenant's identifiers.

## Alert Types

Supported alert types:

- `scoring_job_completed`
- `scoring_job_failed`

Supported severity values:

- `info`
- `error`

Supported status values:

- `unread`
- `read`

## `GET /alerts`

Lists recent alerts owned by the authenticated user and returns an unread count.

### Response `200`

```json
{
  "alerts": [
    {
      "id": "alert-id",
      "type": "scoring_job_completed",
      "severity": "info",
      "status": "unread",
      "message": "Scoring completed. 2 records are ready for review.",
      "relatedEntityType": "dataset",
      "relatedEntityId": "dataset-id",
      "metadata": {
        "jobId": "job-id",
        "datasetId": "dataset-id",
        "scoredRecordCount": 2,
        "requestKind": "score"
      },
      "createdAt": "2026-05-25T00:00:00.000Z",
      "updatedAt": "2026-05-25T00:00:00.000Z"
    }
  ],
  "unreadCount": 1
}
```

## `PATCH /alerts/:alertId/read`

Marks one alert owned by the authenticated user as read.

Cross-user access returns `alert_not_found`.

### Response `200`

```json
{
  "alert": {
    "id": "alert-id",
    "type": "scoring_job_completed",
    "severity": "info",
    "status": "read",
    "message": "Scoring completed. 2 records are ready for review.",
    "createdAt": "2026-05-25T00:00:00.000Z",
    "updatedAt": "2026-05-25T00:00:00.000Z",
    "readAt": "2026-05-25T00:00:00.000Z"
  }
}
```

## `PATCH /alerts/read-all`

Marks all unread alerts owned by the authenticated user as read.

### Response `200`

```json
{
  "updatedCount": 2
}
```

## Alert Error Codes

Possible alert errors:

- `auth_missing_token`
- `auth_invalid_header`
- `auth_invalid_token`
- `alert_invalid_id`
- `alert_not_found`

## Current Limitations

Alerts are currently in-app records only. There is no email delivery, SMS
delivery, realtime websocket feed, external scheduler, delivery worker, or
admin monitoring console.
