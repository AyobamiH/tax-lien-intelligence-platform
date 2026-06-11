# Watchlist API

Phase 6 adds the first decision workflow on top of scored records. Watchlist
routes are authenticated, tenant-scoped, and only accept references to scored
records in the selected workspace.

## Security Model

- All watchlist routes require `Authorization: Bearer <jwt-access-token>`.
- The client never sends `userId`.
- The API verifies the scored record belongs to the selected workspace before
  creating a watchlist item.
- Members can list; owners/admins can add or remove.
- Duplicate adds are idempotent and do not create clutter.
- Cross-workspace references are rejected safely.
- Watchlist responses expose a denormalized score summary, flags, and reasoning;
  they do not expose another user's identifiers.

## `POST /watchlist`

Adds a scored record to the selected workspace watchlist.

### Request

```json
{
  "scoredRecordId": "score-id"
}
```

### Response `201`

```json
{
  "alreadyExists": false,
  "item": {
    "id": "watchlist-item-id",
    "datasetId": "dataset-id",
    "scoredRecordId": "score-id",
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
    "addedAt": "2026-05-25T00:00:00.000Z",
    "createdAt": "2026-05-25T00:00:00.000Z",
    "updatedAt": "2026-05-25T00:00:00.000Z"
  }
}
```

Duplicate adds return `200` with `alreadyExists: true` and the existing item.

## `GET /watchlist`

Returns the selected workspace's watchlist items, sorted for comparison by
investment quality and risk.

### Response `200`

```json
{
  "items": []
}
```

## `DELETE /watchlist/:watchlistItemId`

Removes one watchlist item in the selected workspace.

### Response `200`

```json
{
  "deleted": true,
  "id": "watchlist-item-id"
}
```

## Watchlist Error Codes

Possible watchlist errors:

- `auth_missing_token`
- `auth_invalid_header`
- `auth_invalid_token`
- `validation_failed`
- `watchlist_invalid_scored_record_id`
- `watchlist_scored_record_not_found`
- `watchlist_invalid_item_id`
- `watchlist_item_not_found`

## Current Limitation

The watchlist is intentionally a shortlist foundation. Phase 7 adds separate
portfolio/status tracking for items promoted from scored results or the
watchlist. The watchlist itself does not include notes, tags, team
collaboration, alerts, auction execution, or accounting-style tracking.
