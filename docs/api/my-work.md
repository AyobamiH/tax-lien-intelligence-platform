# My Work API

Phase 37 adds one member-focused aggregation endpoint over existing workspace
workflow signals. It does not create task records.
Phase 38 adds followed records as a separate informational queue.
Phase 44 adds bounded follow-up reminders as an actionable queue over supported
records.

All requests require bearer authentication and active membership in the
workspace selected by `X-Workspace-Id`.

## `GET /my-work`

Returns the authenticated member's current operational queues:

- accessible records assigned to that member;
- pending approval requests that the member may review now;
- accessible discussion threads with unread comments for that member.
- accessible records the member deliberately follows.
- accessible upcoming, due, or overdue follow-ups assigned to or created by the
  member.

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
    "following": 2,
    "followUps": 1,
    "totalActionable": 5
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
    },
    "following": {
      "count": 2,
      "items": []
    },
    "followUps": {
      "count": 1,
      "items": []
    }
  }
}
```

Queue items use the existing `WorkspaceAssignmentResponse`,
`ApprovalRequestResponse`, `DiscussionAttentionResponse`, and
`FollowSubscriptionResponse` contracts. Follow-up items use
`FollowUpResponse`. Each preview returns at most eight items. Counts reflect
the complete bounded source results, which currently retrieve at most 100
records per source.

`totalActionable` is the sum of assigned records, reviewable approvals, and
unread discussion threads, plus due/upcoming follow-ups. `unreadMessages` is
reported separately and is not added again.
`following` is informational and is intentionally excluded from
`totalActionable`; following a record is not the same as accepting an
assignment or review obligation.

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
- Follow subscriptions must belong to the actor and selected workspace, and
  stale or inaccessible targets are omitted.
- Follow-ups are returned only when the actor is the current assignee or, if no
  active assignment exists, the creator; stale or inaccessible targets are
  omitted.

An empty state returns zero counts and empty arrays. An unknown or
cross-workspace selection is rejected by workspace membership middleware.

## Boundary

The endpoint now includes bounded follow-up dates, but still does not add task
objects, priorities, SLAs, workload analytics, urgency scoring, general
workspace activity, recurrence rules, calendars, or AI prioritization. General
activity is intentionally excluded because it is workspace-wide rather than a
reliable personal action signal.
