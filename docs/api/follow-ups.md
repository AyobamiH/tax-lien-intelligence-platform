# Follow-Ups API

Phase 44 adds bounded follow-up dates for important operational records. This
is a due-date and reminder layer over existing records, not a task-management
suite, calendar integration, SLA engine, or recurrence system.

All routes require `Authorization: Bearer <jwt-access-token>` and active
membership in the workspace selected by `X-Workspace-Id`.

Supported targets:

- `comparison_item`
- `watchlist_item`
- `portfolio_item`

Each supported target may have at most one active follow-up in a workspace.
The backend verifies target access before reading, creating, updating, clearing,
or reminding.

## Due State

Follow-up state is derived from the stored due date:

- `none`: no active follow-up exists;
- `upcoming`: due after today;
- `due`: due today or earlier in the current UTC day;
- `overdue`: due before today;
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
  "count": 1,
  "items": [
    {
      "id": "follow-up-id",
      "workspaceId": "workspace-id",
      "targetEntityType": "comparison_item",
      "targetEntityId": "comparison-id",
      "dueAt": "2026-06-17T12:00:00.000Z",
      "dueState": "upcoming",
      "reminderState": "pending",
      "note": "Recheck after reviewer response.",
      "createdByUserId": "creator-id",
      "updatedByUserId": "creator-id",
      "currentAssigneeUserId": "assignee-id",
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
    "reminderState": "pending",
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
    "reminderState": "cleared",
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
and, if it remains open into a later day, one `overdue` reminder. Updating the
date or clearing the follow-up resets that bounded reminder state.

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

## Boundary

Follow-ups are workspace-scoped operational reminders. They do not create task
objects, recurring schedules, calendar entries, SLA reports, workforce
planning, auction execution, or AI scheduling assistance.
