# Workspace Comments API

Workspace comments are authenticated, workspace-scoped plain-text discussion
attached to an existing dataset, comparison item, watchlist item, or portfolio
item.

All routes use the selected `X-Workspace-Id`. The caller must be an active
member and must be able to access the target through that workspace's verified
compatibility tenant key.

Supported `entityType` values:

- `dataset`
- `comparison_item`
- `watchlist_item`
- `portfolio_item`

## `GET /comments/:entityType/:entityId`

Returns up to the 200 most recent comments, ordered oldest first for reading,
for an accessible target. A deleted or
cross-workspace target returns `comment_target_not_found` without exposing
whether it exists elsewhere.

```json
{
  "comments": [
    {
      "id": "comment-id",
      "workspaceId": "workspace-id",
      "author": {
        "userId": "user-id",
        "email": "analyst@example.com"
      },
      "relatedEntityType": "dataset",
      "relatedEntityId": "dataset-id",
      "body": "The lien amount column needs another review.",
      "canDelete": true,
      "createdAt": "2026-06-12T10:00:00.000Z",
      "updatedAt": "2026-06-12T10:00:00.000Z"
    }
  ]
}
```

## `POST /comments/:entityType/:entityId`

Any active member may add discussion to an accessible target, including a
`member` whose core record access is otherwise read-only.

```json
{
  "body": "Please verify the estimated value before moving forward."
}
```

The body is trimmed, must contain text, cannot exceed 1,000 characters, and
cannot contain unsupported control characters. It is stored and returned as
plain text; HTML is not interpreted.

## `DELETE /comments/:commentId`

Hard-deletes a comment. Only the verified original author may delete it. Owners
and admins do not receive a separate moderation override in Phase 31.

Successful response:

```json
{
  "id": "comment-id",
  "deleted": true
}
```

The lookup always includes the selected workspace id. A comment from another
workspace returns `comment_not_found`, even when the caller authored it.

## Boundaries

The API does not provide edit, reply nesting, rich text, mentions, attachments,
reactions, realtime delivery, tasks, approvals, or activity-feed events.
