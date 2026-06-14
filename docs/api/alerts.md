# Alerts API

Phase 9 introduces tenant-owned in-app alerts for important user-visible
workflow events. Alerts are the in-app monitoring surface; Phase 27 adds
preference-aware email delivery/outbox handling for supported job-generated
product alerts.

Phase 26 adds notification preferences and delivery-preparation metadata for
job-generated alerts. Phase 27 adds SMTP-backed immediate email when env config
is complete and digest-ready outbox records. Phase 28 adds scheduled digest
processing and user-visible delivery history. SMS, push, realtime delivery, and
marketing messaging are not implemented.
Phase 32 adds preference-aware alerts for a workspace discussion's first unread
transition.
Phase 33 adds preference-aware alerts when a workspace member becomes the new
assignee for a supported shared record.
Phase 38 adds bounded, preference-aware alerts for consequential changes on
records the recipient follows.

Current alert sources:

- dataset scoring job completed;
- dataset scoring job failed.
- dataset refresh job completed or failed through the same scoring job alert
  types, with `requestKind: "refresh"` metadata.
- policy-created dataset refresh job completed or failed through the same
  scoring job alert types, with `requestKind: "policy_refresh"` metadata and a
  "Scheduled refresh" user-facing label.
- a workspace peer adds a comment to a supported shared record while the
  recipient has no unread comments on that thread.
- a workspace member assigns the recipient to a dataset, comparison item,
  watchlist item, or portfolio item.
- assignment, portfolio status, or approval resolution changes on an
  accessible record the recipient follows.

## Security Model

- Alert routes require `Authorization: Bearer <jwt-access-token>`.
- Alert ownership is derived from the authenticated token.
- The client never sends `userId`.
- Cross-user alert access returns safe not-found errors.
- Alert metadata is intentionally small and safe for browser rendering.
- Alert messages must not include stack traces, raw job internals, uploaded row
  data, secrets, comment body text, or another tenant's identifiers.

## Alert Types

Supported alert types:

- `scoring_job_completed`
- `scoring_job_failed`
- `workspace_comment_added`
- `workspace_item_assigned`
- `followed_item_changed`

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
      "deliveryPreparation": {
        "alertType": "scoring_job_completed",
        "deliveryState": "in_app_only",
        "deliveryMode": "in_app_only",
        "cadence": "digest",
        "eligibleForDelivery": false,
        "preparedAt": "2026-05-25T00:00:00.000Z"
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

Alerts are currently in-app records with provider-agnostic delivery
classification and email outbox tracking. Immediate email sends are available
only for delivery-eligible supported alerts when SMTP env config is complete.
There is no SMS delivery, push delivery, realtime websocket feed, external
scheduler product, or admin monitoring console. Digest processing uses the
existing internal worker scheduler and delivery history is available to users.
Phase 15 scheduled maintenance can create policy-refresh scoring alerts, and
Phase 27 can deliver those as product-alert email when preferences and provider
config allow it.

Discussion alerts remain personal records even though the related comment is
workspace-owned. They include the verified workspace id for safe navigation and
never include comment body text. A member receives at most one discussion alert
per unread cycle for a thread.

Assignment alerts are also personal. They identify only the workspace, target,
assignment, and verified actor. Assigning yourself, assigning the current
assignee again, and clearing responsibility do not create an alert.

Followed-item alerts identify only the workspace, target, allowlisted change
type, stable follow event id, and verified actor. The actor is excluded, and a
new assignee does not receive a duplicate follower alert. Comments, ordinary
note edits, and follow/unfollow actions do not create follower alerts.
