# Outcome Review API

Phase 43 adds a read-only workspace retrospective endpoint over final
comparison-item outcomes.

All routes require authentication and selected-workspace membership through the
`X-Workspace-Id` header when a non-default workspace is selected.

## `GET /outcome-review`

Returns a bounded workspace-level outcome summary, status counts, recent
resolutions, and grounded retrospective signals.

Query parameters:

- `windowDays` optional integer from `1` to `365`; defaults to `30`.

Example response:

```json
{
  "workspaceId": "workspace-id",
  "generatedAt": "2026-06-16T10:00:00.000Z",
  "windowDays": 30,
  "summary": {
    "totalComparisonItems": 8,
    "resolvedItems": 5,
    "unresolvedItems": 3,
    "resolutionRate": 62.5,
    "recentResolvedItems": 2,
    "recentDeferredOrDeclinedItems": 1,
    "countsByStatus": [
      { "status": "approved", "count": 2 },
      { "status": "declined", "count": 1 },
      { "status": "deferred", "count": 1 },
      { "status": "archived", "count": 1 }
    ],
    "countsByEntityType": [
      { "targetEntityType": "comparison_item", "count": 5 }
    ]
  },
  "recentResolutions": [
    {
      "outcome": {
        "id": "outcome-id",
        "workspaceId": "workspace-id",
        "targetEntityType": "comparison_item",
        "targetEntityId": "comparison-item-id",
        "status": "declined",
        "resolver": {
          "userId": "user-id",
          "email": "owner@example.com",
          "role": "owner"
        },
        "note": "Title risk is too high for this sale.",
        "resolvedAt": "2026-06-16T10:00:00.000Z",
        "createdAt": "2026-06-16T10:00:00.000Z",
        "updatedAt": "2026-06-16T10:00:00.000Z"
      },
      "target": {
        "targetEntityType": "comparison_item",
        "targetEntityId": "comparison-item-id",
        "label": "Parcel PX-101",
        "datasetId": "dataset-id",
        "decision": "move_forward",
        "investmentScore": 84,
        "riskScore": 24,
        "propertyTypeCategory": "residential",
        "sourceRowNumber": 7
      }
    }
  ],
  "signals": [
    {
      "code": "unresolved_comparison_items",
      "severity": "info",
      "label": "Active comparison work remains",
      "detail": "3 comparison items are still without a final outcome.",
      "count": 3
    }
  ]
}
```

Stale/deleted comparison targets are omitted from returned counts and recent
resolution rows. The endpoint uses current comparison access before returning
target summaries, so aggregation does not expose cross-workspace or
inaccessible item details.

## Boundaries

This API is a lightweight retrospective layer. It does not provide arbitrary BI
queries, exports, predictive analytics, financial performance modeling,
compliance reporting, legal evidence systems, or auction execution.
