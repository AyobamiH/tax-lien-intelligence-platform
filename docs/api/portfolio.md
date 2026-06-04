# Portfolio API

Phase 7 adds portfolio/status tracking as the first post-shortlist operating
layer. Portfolio routes are authenticated, tenant-scoped, and only accept
references to scored records or watchlist items owned by the authenticated user.
Phase 24 adds a portfolio summary endpoint for operational review.

The portfolio is not an accounting, brokerage, auction, or return-tracking
system. It records which scored opportunities the user is actively tracking and
the current decision status for each tracked item. Summary responses are
operational visibility, not financial analytics.

## Security Model

- All portfolio routes require `Authorization: Bearer <jwt-access-token>`.
- The client never sends `userId`.
- A portfolio item can be created from exactly one owned `scoredRecordId` or one
  owned `watchlistItemId`.
- Cross-user source references return safe not-found errors.
- Duplicate adds for the same scored record are idempotent.
- Status changes are limited to the supported portfolio status enum.
- Portfolio responses expose denormalized score context, flags, and reasoning
  for the signed-in user only.
- Portfolio summaries aggregate only the signed-in user's portfolio records and
  do not expose `userId`, raw dataset rows, or cross-tenant activity.

## Portfolio Statuses

Supported statuses:

- `tracked`
- `reviewing`
- `ready`
- `acquired`
- `closed`
- `discarded`

Statuses are intentionally simple. They indicate operating state, not legal,
financial, or accounting truth.

## `POST /portfolio`

Adds a scored record or watchlist item to portfolio tracking.

### Request From Scored Record

```json
{
  "scoredRecordId": "score-id",
  "status": "reviewing"
}
```

### Request From Watchlist Item

```json
{
  "watchlistItemId": "watchlist-item-id"
}
```

If `status` is omitted, the API uses `tracked`.

Exactly one of `scoredRecordId` or `watchlistItemId` must be provided.

### Response `201`

```json
{
  "alreadyExists": false,
  "item": {
    "id": "portfolio-item-id",
    "datasetId": "dataset-id",
    "scoredRecordId": "score-id",
    "sourceWatchlistItemId": "watchlist-item-id",
    "status": "reviewing",
    "statusUpdatedAt": "2026-05-25T00:00:00.000Z",
    "sourceRowNumber": 2,
    "normalizedFields": {
      "parcelId": "A-100",
      "lienAmount": 1000,
      "estimatedValue": 12000,
      "propertyType": "Single-family residential",
      "propertyTypeCategory": "residential"
    },
    "investmentScore": 82,
    "riskScore": 18,
    "liquidityScore": 86,
    "redemptionProbability": 0.8,
    "confidenceScore": 100,
    "valueCoverageRatio": 12,
    "flags": [],
    "reasoning": [
      "Residential property type usually has stronger resale and redemption signals."
    ],
    "scoredAt": "2026-05-25T00:00:00.000Z",
    "trackedAt": "2026-05-25T00:00:00.000Z",
    "createdAt": "2026-05-25T00:00:00.000Z",
    "updatedAt": "2026-05-25T00:00:00.000Z"
  }
}
```

Duplicate adds return `200` with `alreadyExists: true` and the existing item.

## `GET /portfolio`

Returns the authenticated user's portfolio items.

### Response `200`

```json
{
  "items": []
}
```

## `GET /portfolio/summary`

Returns an authenticated, tenant-scoped operational summary for the user's
portfolio dashboard.

The summary is derived from existing portfolio item state. It includes status
distribution, recent additions, recent status changes, and conservative
attention indicators grounded in current data such as review status, tracked
items without a next status, score flags, and low confidence.

### Response `200`

```json
{
  "totalTrackedItems": 2,
  "activeItems": 2,
  "readyItems": 1,
  "acquiredItems": 0,
  "statusCounts": [
    {
      "status": "tracked",
      "count": 1,
      "isActive": true
    }
  ],
  "recentAdditions": [
    {
      "activityType": "added",
      "occurredAt": "2026-06-01T10:00:00.000Z",
      "message": "Portfolio tracking started from scored review.",
      "item": {
        "id": "portfolio-item-id",
        "datasetId": "dataset-id",
        "scoredRecordId": "score-id",
        "status": "tracked",
        "statusUpdatedAt": "2026-06-01T10:00:00.000Z",
        "sourceRowNumber": 2,
        "normalizedFields": {
          "parcelId": "A-100",
          "propertyTypeCategory": "residential"
        },
        "investmentScore": 82,
        "riskScore": 18,
        "confidenceScore": 90,
        "flagCount": 0,
        "trackedAt": "2026-06-01T10:00:00.000Z",
        "updatedAt": "2026-06-01T10:00:00.000Z"
      }
    }
  ],
  "recentStatusChanges": [],
  "needsAttention": [
    {
      "item": {
        "id": "portfolio-item-id",
        "datasetId": "dataset-id",
        "scoredRecordId": "score-id",
        "status": "tracked",
        "statusUpdatedAt": "2026-06-01T10:00:00.000Z",
        "sourceRowNumber": 2,
        "normalizedFields": {
          "parcelId": "A-100",
          "propertyTypeCategory": "residential"
        },
        "investmentScore": 82,
        "riskScore": 18,
        "confidenceScore": 90,
        "flagCount": 0,
        "trackedAt": "2026-06-01T10:00:00.000Z",
        "updatedAt": "2026-06-01T10:00:00.000Z"
      },
      "reasons": [
        {
          "code": "tracked_without_next_status",
          "severity": "info",
          "message": "Item is tracked but has not moved into a next decision status."
        }
      ]
    }
  ],
  "generatedAt": "2026-06-01T10:05:00.000Z"
}
```

Summary records are intentionally smaller than full portfolio item responses.
They include enough context for dashboard navigation and review without turning
the endpoint into raw source-row or analytics export.

## `GET /portfolio/:portfolioItemId`

Returns one portfolio item owned by the authenticated user.

### Response `200`

```json
{
  "item": {
    "id": "portfolio-item-id",
    "status": "tracked"
  }
}
```

The real response uses the same full portfolio item shape returned by
`POST /portfolio`.

## `PATCH /portfolio/:portfolioItemId`

Updates the status for one owned portfolio item.

### Request

```json
{
  "status": "ready"
}
```

### Response `200`

```json
{
  "item": {
    "id": "portfolio-item-id",
    "status": "ready"
  }
}
```

The real response uses the same full portfolio item shape returned by
`POST /portfolio`.

## `DELETE /portfolio/:portfolioItemId`

Removes one portfolio item owned by the authenticated user.

### Response `200`

```json
{
  "deleted": true,
  "id": "portfolio-item-id"
}
```

## Portfolio Error Codes

Possible portfolio errors:

- `auth_missing_token`
- `auth_invalid_header`
- `auth_invalid_token`
- `validation_failed`
- `portfolio_invalid_source`
- `portfolio_invalid_scored_record_id`
- `portfolio_scored_record_not_found`
- `portfolio_invalid_watchlist_item_id`
- `portfolio_watchlist_item_not_found`
- `portfolio_invalid_item_id`
- `portfolio_item_not_found`
- `portfolio_invalid_status`

## Current Limitation

Portfolio tracking and summary visibility are intentionally narrow. They do not
include notes, tags, collaboration, auction execution, accounting, payment
tracking, return calculators, BI/report builders, spreadsheet export suites, or
portfolio performance analytics.
