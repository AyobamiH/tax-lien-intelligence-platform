# Decision Outcomes API

Phase 42 adds an explicit final-resolution API for supported decision records.
The first supported target is `comparison_item`. This is an internal closure
layer, not legal case management, settlement tracking, e-signature, or auction
execution.

All routes require authentication and active membership in the selected
`X-Workspace-Id`.

## `GET /decision-outcomes/comparison_item/:entityId`

Returns the current active/resolved state for an accessible comparison item.

Unresolved response:

```json
{
  "targetEntityType": "comparison_item",
  "targetEntityId": "comparison-id",
  "resolved": false
}
```

Resolved response:

```json
{
  "targetEntityType": "comparison_item",
  "targetEntityId": "comparison-id",
  "resolved": true,
  "outcome": {
    "id": "outcome-id",
    "workspaceId": "workspace-id",
    "targetEntityType": "comparison_item",
    "targetEntityId": "comparison-id",
    "status": "approved",
    "resolver": {
      "userId": "user-id",
      "email": "owner@example.com",
      "role": "owner"
    },
    "note": "Approved after checklist and brief review.",
    "resolvedAt": "2026-06-16T10:00:00.000Z",
    "createdAt": "2026-06-16T10:00:00.000Z",
    "updatedAt": "2026-06-16T10:00:00.000Z"
  }
}
```

## `PUT /decision-outcomes/comparison_item/:entityId`

Creates or updates the one current final outcome for the comparison item.
Owners and admins may resolve; members may read outcome state.

```json
{
  "status": "declined",
  "note": "Risk is too high for this sale."
}
```

Supported statuses:

- `approved`
- `declined`
- `deferred`
- `archived`

The response wraps the current state and a `changed` flag. Repeating the same
status and note is idempotent and returns `changed: false`.

Approved outcomes are checked against current governance evidence. If required
assignment/checklist policy gates are unmet, the API returns
`409 decision_outcome_prerequisite_blocked`. If a pending approval exists for
the comparison item, it returns `409 decision_outcome_pending_approval`.

Meaningful changes create one workspace activity event,
`decision_outcome_resolved`, without copying the resolution note into activity
metadata.

## Boundary

The API does not implement reopen flows, legal records, downstream settlement
tracking, signatures, public portals, reminders, or case management.
