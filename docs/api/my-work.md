# My Work API

Phase 37 adds one member-focused aggregation endpoint over existing workspace
workflow signals. It does not create task records.

All requests require bearer authentication and active membership in the
workspace selected by `X-Workspace-Id`.

## `GET /my-work`

Returns the authenticated member's current operational queues:

- accessible records assigned to that member;
- pending approval requests that the member may review now;
- accessible discussion threads with unread comments for that member.

Example response:

```json
{
  "workspaceId": "workspace-id",
  "generatedAt": "2026-06-14T10:00:00.000Z",
  "counts": {
    "assigned": 2,
    "approvals": 1,
    "unreadDiscussions": 1,
    "unreadMessages": 3,
    "totalActionable": 4
  },
  "queues": {
    "assignments": {
      "count": 2,
      "items": []
    },
    "approvals": {
      "count": 1,
      "items": []
    },
    "discussions": {
      "count": 1,
      "unreadCount": 3,
      "items": []
    }
  }
}
```

Queue items use the existing `WorkspaceAssignmentResponse`,
`ApprovalRequestResponse`, and `DiscussionAttentionResponse` contracts. Each
preview returns at most eight items. Counts reflect the complete bounded source
results, which currently retrieve at most 100 records per source.

`totalActionable` is the sum of assigned records, reviewable approvals, and
unread discussion threads. `unreadMessages` is reported separately and is not
added again.

## Visibility Rules

- Assignment retrieval keeps its existing assignee, workspace, and target
  access checks.
- Approval entries must be pending, server-derived `canReview: true`, and point
  to a still-accessible target.
- Discussion attention must belong to the authenticated user and selected
  workspace, remain unread, and point to a still-accessible target.
- Stale or inaccessible targets are omitted rather than disclosed.
- Requester-owned approvals that the actor cannot review are not returned.
- Comment body text is never included.

An empty state returns zero counts and empty arrays. An unknown or
cross-workspace selection is rejected by workspace membership middleware.

## Boundary

The endpoint does not add due dates, priorities, task status, SLAs, workload
analytics, urgency scoring, general workspace activity, or AI prioritization.
General activity is intentionally excluded because it is workspace-wide rather
than a reliable personal action signal.
