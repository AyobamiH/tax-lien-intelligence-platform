# Saved Views API

Phase 25 adds tenant-owned saved operational views for returning to useful
portfolio and comparison work slices. Saved views are practical reusable filter
configuration, not a reporting system or arbitrary query builder.

All saved-view routes require `Authorization: Bearer <jwt-access-token>`.

## Supported Surfaces

- `portfolio`
- `comparison`

Portfolio filters may include:

- `statuses`: supported portfolio statuses;
- `queue`: `needs_attention` or `recently_changed`;
- `hasFlags`;
- `maxRiskScore`;
- `minConfidenceScore`.

Comparison filters may include:

- `decisions`: supported comparison decisions;
- `sourceTypes`: `score`, `watchlist`, or `portfolio`;
- `queue`: `needs_decision` or `recent_decisions`;
- `hasNote`.

Sorts are limited to known operational fields such as tracked/added timestamps
and score fields. The API rejects unsupported criteria.

## `POST /saved-views`

Creates a saved view for the authenticated user.

```json
{
  "surface": "portfolio",
  "name": "Ready portfolio review",
  "filters": {
    "statuses": ["ready"]
  },
  "sort": {
    "key": "tracked_at",
    "direction": "desc"
  }
}
```

Response `201`:

```json
{
  "view": {
    "id": "saved-view-id",
    "surface": "portfolio",
    "name": "Ready portfolio review",
    "filters": {
      "statuses": ["ready"]
    },
    "sort": {
      "key": "tracked_at",
      "direction": "desc"
    },
    "createdAt": "2026-06-01T10:00:00.000Z",
    "updatedAt": "2026-06-01T10:00:00.000Z"
  }
}
```

## `GET /saved-views`

Lists the authenticated user's saved views plus built-in operational queues.

Response `200`:

```json
{
  "views": [],
  "queues": [
    {
      "id": "portfolio-needs-attention",
      "surface": "portfolio",
      "name": "Needs attention",
      "description": "Tracked portfolio items with review status, flags, low confidence, or no next status.",
      "filters": {
        "queue": "needs_attention"
      },
      "sort": {
        "key": "status_updated_at",
        "direction": "desc"
      },
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    }
  ]
}
```

## `GET /saved-views/:savedViewId/apply`

Applies a saved view or built-in queue to the authenticated user's data.

Portfolio response:

```json
{
  "view": {
    "id": "portfolio-needs-attention",
    "surface": "portfolio",
    "name": "Needs attention",
    "filters": {
      "queue": "needs_attention"
    },
    "createdAt": "1970-01-01T00:00:00.000Z",
    "updatedAt": "1970-01-01T00:00:00.000Z"
  },
  "surface": "portfolio",
  "items": [],
  "summary": {
    "totalTrackedItems": 0,
    "activeItems": 0,
    "readyItems": 0,
    "acquiredItems": 0,
    "statusCounts": [],
    "recentAdditions": [],
    "recentStatusChanges": [],
    "needsAttention": [],
    "generatedAt": "2026-06-01T10:05:00.000Z"
  }
}
```

Comparison responses return the matching `items` for the comparison surface.

## `PATCH /saved-views/:savedViewId`

Updates a user-owned saved view. Built-in queues cannot be updated.

## `DELETE /saved-views/:savedViewId`

Deletes a user-owned saved view. Built-in queues cannot be deleted.

## Errors

Possible saved-view errors:

- `auth_missing_token`
- `saved_view_invalid_id`
- `saved_view_not_found`
- `saved_view_invalid_surface`
- `saved_view_invalid_filter`
- `saved_view_invalid_sort`
- `saved_view_invalid_name`
- `saved_view_invalid_description`
- `saved_view_empty_update`

Saved views are tenant-owned operational configuration. They do not expose
cross-user data, hidden/internal fields, raw source rows, SQL-like criteria,
shared/team views, exports, or BI/report-builder behavior.
