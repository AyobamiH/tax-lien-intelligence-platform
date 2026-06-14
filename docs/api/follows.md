# Follow Subscriptions API

Phase 38 adds a workspace-scoped stakeholder-awareness layer for datasets,
comparison items, watchlist items, and portfolio items. Following is personal
workspace state. It does not assign responsibility, grant access, or create a
social relationship.

All routes require bearer authentication, active membership in the workspace
selected by `X-Workspace-Id`, and access to the target record where relevant.

Supported `entityType` values:

- `dataset`
- `comparison_item`
- `watchlist_item`
- `portfolio_item`

## `GET /follows`

Returns the authenticated member's followed records in the selected workspace.
Stale or no-longer-accessible targets are omitted.

```json
{
  "follows": [
    {
      "id": "follow-id",
      "workspaceId": "workspace-id",
      "targetEntityType": "portfolio_item",
      "targetEntityId": "portfolio-item-id",
      "followedAt": "2026-06-14T10:00:00.000Z"
    }
  ]
}
```

## `GET /follows/:entityType/:entityId`

Returns the actor's current follow state plus the count of active workspace
members following the target. Follower identities are not exposed.

## `PUT /follows/:entityType/:entityId`

Follows an accessible target. Creation returns `201`; repeating the same
request is duplicate-safe and returns `200` with `alreadyFollowing: true`.

## `DELETE /follows/:entityType/:entityId`

Removes the actor's subscription and is idempotent. Unfollow deliberately
allows cleanup after a target becomes stale; state retrieval and new follow
creation still reject stale or inaccessible targets.

## Errors

Relevant errors include:

- `auth_missing_token`
- `workspace_access_denied`
- `follow_invalid_target_id`
- `follow_target_not_found`

Cross-workspace and inaccessible targets are never disclosed.

## Notification Boundary

Followers may receive `followed_item_changed` alerts for:

- assignment or responsibility changes;
- portfolio status changes;
- approval resolution on a followed comparison item.

The actor is excluded. A newly assigned member is also excluded from the
follower alert because the direct assignment alert already supplies that
context. Personal notification preferences decide whether the alert is
suppressed, in-app-only, immediate-delivery eligible, or digest eligible.

Comments, follow/unfollow actions, ordinary comparison note edits, read state,
and other minor changes do not generate follower alerts in this phase.
