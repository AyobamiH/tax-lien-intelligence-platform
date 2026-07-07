# Follow-Ups API

Phase 44 adds bounded follow-up dates for important operational records. This
is a due-date and reminder layer over existing records, not a task-management
suite, calendar integration, SLA engine, or recurrence system.
Phase 45 adds explicit completion and snooze controls so due reminders can be
resolved or deferred without creating task objects or recurring rules.

All routes require `Authorization: Bearer <jwt-access-token>` and active
membership in the workspace selected by `X-Workspace-Id`.

Supported targets:

- `comparison_item`
- `watchlist_item`
- `portfolio_item`

Each supported target may have at most one active follow-up in a workspace.
The backend verifies target access before reading, creating, updating, clearing,
completing, snoozing, or reminding.

## Due State

Follow-up state is derived from the stored due date:

- `none`: no active follow-up exists;
- `upcoming`: due after today;
- `due`: due today or earlier in the current UTC day;
- `overdue`: due before today;
- `completed`: explicitly completed and retained as operational context;
- `cleared`: a previously active follow-up was cleared.

The API accepts ISO date/time strings. Dates must be valid and no more than one
year in the future. Notes are optional and capped at 500 characters.

## `GET /follow-ups/queue`

Returns the authenticated member's personal upcoming/due/overdue follow-up
queue for the selected workspace. The queue is bounded and target-revalidated.
The current assignee receives the follow-up when the target has an active
assignment; otherwise the creator receives it.

Response `200`:

```json
{
  "workspaceId": "workspace-id",
  "generatedAt": "2026-06-16T10:00:00.000Z",
  "windowDays": 14,
  "counts": {
    "upcoming": 1,
    "due": 0,
    "overdue": 0,
    "total": 1
  },
  "items": [
    {
      "id": "follow-up-id",
      "workspaceId": "workspace-id",
      "targetEntityType": "comparison_item",
      "targetEntityId": "comparison-id",
      "dueAt": "2026-06-17T12:00:00.000Z",
      "dueState": "upcoming",
      "lastReminderState": "none",
      "note": "Recheck after reviewer response.",
      "createdByUserId": "creator-id",
      "updatedByUserId": "creator-id",
      "createdAt": "2026-06-16T10:00:00.000Z",
      "updatedAt": "2026-06-16T10:00:00.000Z"
    }
  ]
}
```

## `GET /follow-ups/:entityType/:entityId`

Returns the current follow-up state for one supported target.

Response `200`:

```json
{
  "workspaceId": "workspace-id",
  "targetEntityType": "portfolio_item",
  "targetEntityId": "portfolio-id",
  "dueState": "none",
  "followUp": null
}
```

## `PUT /follow-ups/:entityType/:entityId`

Creates or updates the active follow-up for one supported target.

Request:

```json
{
  "dueAt": "2026-06-20T12:00:00.000Z",
  "note": "Review after title search."
}
```

Response `200`:

```json
{
  "changed": true,
  "followUp": {
    "id": "follow-up-id",
    "workspaceId": "workspace-id",
    "targetEntityType": "portfolio_item",
    "targetEntityId": "portfolio-id",
    "dueAt": "2026-06-20T12:00:00.000Z",
    "dueState": "upcoming",
    "lastReminderState": "none",
    "note": "Review after title search.",
    "createdByUserId": "creator-id",
    "updatedByUserId": "creator-id",
    "createdAt": "2026-06-16T10:00:00.000Z",
    "updatedAt": "2026-06-16T10:00:00.000Z"
  }
}
```

Setting a new due date resets reminder state so a future scheduler scan may
emit one bounded reminder for the new due state.

## `POST /follow-ups/:entityType/:entityId/complete`

Completes an active follow-up. Completed follow-ups stay inspectable on the
target, but no longer appear in active queues or scheduler reminder scans.

Response `200`:

```json
{
  "targetEntityType": "portfolio_item",
  "targetEntityId": "portfolio-id",
  "completed": true,
  "followUp": {
    "id": "follow-up-id",
    "workspaceId": "workspace-id",
    "targetEntityType": "portfolio_item",
    "targetEntityId": "portfolio-id",
    "dueAt": "2026-06-20T12:00:00.000Z",
    "dueState": "completed",
    "completedAt": "2026-06-20T15:00:00.000Z",
    "completedByUserId": "user-id",
    "lastReminderState": "due",
    "createdByUserId": "creator-id",
    "updatedByUserId": "user-id",
    "createdAt": "2026-06-16T10:00:00.000Z",
    "updatedAt": "2026-06-20T15:00:00.000Z"
  }
}
```

## `POST /follow-ups/:entityType/:entityId/snooze`

Reschedules an existing follow-up to a new due date and resets reminder state.
Snoozing can reactivate a completed follow-up, but does not revive a cleared
follow-up.

Request:

```json
{
  "dueAt": "2026-06-27T12:00:00.000Z",
  "note": "Wait for county update."
}
```

Response `200`:

```json
{
  "changed": true,
  "followUp": {
    "id": "follow-up-id",
    "workspaceId": "workspace-id",
    "targetEntityType": "portfolio_item",
    "targetEntityId": "portfolio-id",
    "dueAt": "2026-06-27T12:00:00.000Z",
    "dueState": "upcoming",
    "previousDueAt": "2026-06-20T12:00:00.000Z",
    "snoozedAt": "2026-06-20T15:10:00.000Z",
    "snoozedByUserId": "user-id",
    "lastReminderState": "none",
    "createdByUserId": "creator-id",
    "updatedByUserId": "user-id",
    "createdAt": "2026-06-16T10:00:00.000Z",
    "updatedAt": "2026-06-20T15:10:00.000Z"
  }
}
```

## `DELETE /follow-ups/:entityType/:entityId`

Clears the active follow-up for one supported target.

Response `200`:

```json
{
  "cleared": true,
  "followUp": {
    "id": "follow-up-id",
    "workspaceId": "workspace-id",
    "targetEntityType": "portfolio_item",
    "targetEntityId": "portfolio-id",
    "dueAt": "2026-06-20T12:00:00.000Z",
    "dueState": "cleared",
    "lastReminderState": "none",
    "clearedAt": "2026-06-18T09:00:00.000Z",
    "clearedByUserId": "user-id",
    "createdByUserId": "creator-id",
    "updatedByUserId": "user-id",
    "createdAt": "2026-06-16T10:00:00.000Z",
    "updatedAt": "2026-06-18T09:00:00.000Z"
  }
}
```

## Scheduler Reminders

The worker registers `follow-up-reminder-scan` with the internal scheduler.
The default interval is controlled by `FOLLOW_UP_REMINDER_INTERVAL_MS`.

The scan:

1. loads due and overdue active follow-ups;
2. revalidates target access;
3. resolves the recipient from current assignment or creator fallback;
4. records one `follow_up_due` alert for a due-state transition;
5. marks the follow-up with the reminder state and timestamp.

This suppresses repeated noisy alerts. A follow-up can emit one `due` reminder
and, if it remains open into a later day, one `overdue` reminder. Updating or
snoozing the date resets that bounded reminder state. Completing or clearing
the follow-up removes it from future reminder scans.

## Local Verification

`npm run smoke:follow-ups:browser` exercises the existing portfolio follow-up
API contract from the React shell with synthetic local responses. The smoke
verifies `GET`, `PUT`, `complete`, and `snooze` calls include bearer auth and
the selected `X-Workspace-Id`, and records local JSON evidence for due,
completed, and snoozed/upcoming UI states. This is browser-like contract proof,
not a deployed API call or screenshot capture.

## Error Codes

Possible follow-up errors:

- `auth_missing_token`
- `auth_invalid_header`
- `auth_invalid_token`
- `workspace_required`
- `workspace_access_denied`
- `follow_up_invalid_target`
- `follow_up_target_not_found`
- `follow_up_invalid_due_at`
- `follow_up_due_at_too_far`
- `follow_up_invalid_note`
- `follow_up_not_found`

## Boundary

Follow-ups are workspace-scoped operational reminders. They do not create task
objects, recurring schedules, calendar entries, SLA reports, workforce
planning, auction execution, or AI scheduling assistance.
