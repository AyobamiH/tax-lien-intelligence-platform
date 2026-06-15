# Review Checklists API

Phase 39 adds workspace-scoped review checklist templates and record-level
completion for comparison items, watchlist items, and portfolio items. This is
a lightweight review-discipline contract, not a compliance or workflow engine.

All routes require authentication and active membership in the selected
`X-Workspace-Id`.

## `GET /review-checklists/templates`

Returns every checklist template configured in the selected workspace.
Owners, admins, and members may read templates.

## `PUT /review-checklists/templates/:entityType`

Creates or replaces the selected record-type template. Only owners and admins
may manage templates.

Supported target types are `comparison_item`, `watchlist_item`, and
`portfolio_item`. Templates contain a bounded name, active state, and 1 to 20
ordered required/optional items. Existing item ids may be sent during updates;
stable ids preserve prior record completion. Unknown, malformed, or duplicate
ids are rejected.

## `GET /review-checklists/:entityType/:entityId`

Returns the active template, record checklist snapshot, and progress summary.
The API revalidates current target access. When no active template applies, the
response returns `progress.status: "not_configured"`.

Progress is `not_configured`, `not_started`, `in_progress`, or `ready`.
`ready` means all required items are complete; optional incomplete items do not
prevent readiness.

## `PATCH /review-checklists/:entityType/:entityId/items/:itemId`

Marks one item complete or incomplete:

```json
{
  "completed": true
}
```

Any active member who can access the record may update completion. The server
records the authenticated completing actor and timestamp. Reopening an item
clears that attribution.

Cross-workspace, inaccessible, and stale targets do not disclose record
existence.
