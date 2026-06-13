# Workspace Assignments API

Phase 33 adds one current workspace-owned responsibility assignment to each
supported shared record. Assignments are not tasks and do not include due dates,
status, priority, subtasks, reminders, or approval state.

All routes require authentication, selected-workspace membership through
`X-Workspace-Id`, and verified access to the related record.

Supported `entityType` values:

- `dataset`
- `comparison_item`
- `watchlist_item`
- `portfolio_item`

## `GET /assignments/mine`

Returns up to 100 current assignments for the authenticated member in the
selected workspace. Stale or no-longer-accessible targets are omitted.

```json
{
  "assignments": [
    {
      "id": "assignment-id",
      "workspaceId": "workspace-id",
      "relatedEntityType": "dataset",
      "relatedEntityId": "dataset-id",
      "assignee": {
        "userId": "member-user-id",
        "email": "member@example.com"
      },
      "assignedBy": {
        "userId": "owner-user-id",
        "email": "owner@example.com"
      },
      "assignedAt": "2026-06-12T12:00:00.000Z",
      "updatedAt": "2026-06-12T12:00:00.000Z"
    }
  ]
}
```

## `GET /assignments/:entityType/:entityId`

Returns the target's current assignment or `null`. Invalid ids return
`assignment_invalid_entity_id`; inaccessible and stale targets return
`assignment_target_not_found`.

## `PATCH /assignments/:entityType/:entityId`

Assigns or reassigns the target to an active member of the selected workspace.
All active members may use this additive responsibility control. The backend
does not accept an email, role, workspace id, or actor id from the client.

```json
{
  "assigneeUserId": "member-user-id"
}
```

Assigning the current assignee again is a successful no-op with
`"changed": false`. A meaningful assignment or reassignment creates bounded
workspace activity. The new assignee receives a personal
`workspace_item_assigned` alert unless they performed the action themselves.

## `DELETE /assignments/:entityType/:entityId`

Clears current responsibility. Clearing an already-unassigned target is a
successful no-op. A meaningful clear creates workspace activity but no alert.

## Boundaries

There is exactly one current assignee per supported record. Phase 33 does not
provide task status, due dates, reminders, assignment comments, approval
workflow, kanban views, automatic routing, or auction execution.
