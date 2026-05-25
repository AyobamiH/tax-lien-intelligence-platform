# Portfolio API

Phase 7 adds portfolio/status tracking as the first post-shortlist operating
layer. Portfolio routes are authenticated, tenant-scoped, and only accept
references to scored records or watchlist items owned by the authenticated user.

The portfolio is not an accounting, brokerage, auction, or return-tracking
system. It records which scored opportunities the user is actively tracking and
the current decision status for each tracked item.

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

Portfolio tracking is intentionally narrow. It does not include notes, tags,
alerts, collaboration, auction execution, accounting, payment tracking, or
portfolio performance analytics.
