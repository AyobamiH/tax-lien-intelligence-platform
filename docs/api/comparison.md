# Comparison API

Phase 21 adds a tenant-owned comparison workspace for lightweight decision
review. The comparison workspace is an authenticated, user-private layer above
scored records, watchlist items, and portfolio items.

The comparison API does not execute auctions, create portfolio positions, send
notifications, or make investment recommendations. It stores the user's selected
comparison candidates, a small decision state, an optional bounded note, and a
lightweight history of decision/note changes.

## Security Model

- All comparison routes require `Authorization: Bearer <jwt-access-token>`.
- A comparison item can be created from exactly one owned `scoredRecordId`, one
  owned `watchlistItemId`, or one owned `portfolioItemId`.
- The server derives `userId`, workspace id, dataset id, scored record id, and
  score snapshot fields.
- The browser cannot submit score values, ownership fields, source snapshots, or
  workspace ownership.
- List, update, and delete operations are scoped to the authenticated user.
- History retrieval is scoped to an owned comparison item. Deleted or stale
  comparison item ids return `comparison_item_not_found`.

## Decision States

Supported comparison decisions:

- `undecided`
- `keep_reviewing`
- `move_forward`
- `rejected`

These states are review markers only. `move_forward` does not automatically
create a portfolio item or trigger auction behavior.

## `POST /comparison`

Adds an owned scored record, watchlist item, or portfolio item to the default
comparison workspace.

Request body:

```json
{
  "watchlistItemId": "watchlist-item-id"
}
```

Exactly one of `scoredRecordId`, `watchlistItemId`, or `portfolioItemId` must be
provided.

Response:

```json
{
  "item": {
    "id": "comparison-item-id",
    "workspaceId": "default",
    "datasetId": "dataset-id",
    "scoredRecordId": "scored-record-id",
    "sourceType": "watchlist",
    "sourceWatchlistItemId": "watchlist-item-id",
    "decision": "undecided",
    "decisionUpdatedAt": "2026-06-01T00:00:00.000Z",
    "sourceRowNumber": 2,
    "normalizedFields": {
      "parcelId": "A-100",
      "lienAmount": 1000,
      "estimatedValue": 12000,
      "propertyTypeCategory": "residential"
    },
    "investmentScore": 84,
    "riskScore": 18,
    "liquidityScore": 76,
    "redemptionProbability": 0.82,
    "confidenceScore": 88,
    "valueCoverageRatio": 12,
    "flags": [],
    "reasoning": ["Strong value coverage ratio."],
    "scoredAt": "2026-06-01T00:00:00.000Z",
    "addedAt": "2026-06-01T00:00:00.000Z",
    "createdAt": "2026-06-01T00:00:00.000Z",
    "updatedAt": "2026-06-01T00:00:00.000Z"
  },
  "alreadyExists": false
}
```

Duplicate adds for the same scored record are idempotent and return the existing
comparison item with `alreadyExists: true`.

## `GET /comparison`

Returns the authenticated user's default comparison workspace items.

Response:

```json
{
  "items": []
}
```

## `PATCH /comparison/:comparisonItemId`

Updates the decision state and/or note for one owned comparison item.

Request body:

```json
{
  "decision": "move_forward",
  "note": "Confirm sale terms before bid."
}
```

Notes are plain text, trimmed, capped at 500 characters, and reject unsupported
control characters. Send `null` or an empty note to clear the note.

Response:

```json
{
  "item": {
    "id": "comparison-item-id",
    "decision": "move_forward",
    "note": "Confirm sale terms before bid."
  }
}
```

The real response uses the same full comparison item shape returned by
`POST /comparison`.

When the decision or note actually changes, the server records a bounded
history event. No history event is created for no-op updates.

## `GET /comparison/:comparisonItemId/history`

Returns lightweight decision history for one owned comparison item.

Response:

```json
{
  "events": [
    {
      "id": "history-event-id",
      "relatedEntityType": "comparison_item",
      "relatedEntityId": "comparison-item-id",
      "eventType": "comparison_decision_changed",
      "previousDecision": "undecided",
      "newDecision": "move_forward",
      "noteSnapshot": "Confirm sale terms before bid.",
      "metadata": {
        "workspaceId": "default",
        "datasetId": "dataset-id",
        "scoredRecordId": "scored-record-id",
        "sourceType": "watchlist"
      },
      "createdAt": "2026-06-01T00:00:00.000Z",
      "updatedAt": "2026-06-01T00:00:00.000Z"
    }
  ]
}
```

Supported history event types:

- `comparison_decision_changed`
- `comparison_note_changed`

History events intentionally store bounded note snapshots and safe source
metadata only. They do not expose raw dataset rows, internal processing details,
or rich diffs.

## `DELETE /comparison/:comparisonItemId`

Removes one comparison item owned by the authenticated user.

Response:

```json
{
  "deleted": true,
  "id": "comparison-item-id"
}
```

## Error Cases

Possible comparison errors:

- `auth_missing_token`
- `validation_failed`
- `comparison_invalid_source`
- `comparison_invalid_scored_record_id`
- `comparison_scored_record_not_found`
- `comparison_invalid_watchlist_item_id`
- `comparison_watchlist_item_not_found`
- `comparison_invalid_portfolio_item_id`
- `comparison_portfolio_item_not_found`
- `comparison_invalid_item_id`
- `comparison_item_not_found`
- `comparison_invalid_update`
- `comparison_invalid_decision`
- `comparison_note_too_long`
- `comparison_invalid_note`

## Out Of Scope

The comparison API intentionally does not include collaboration, team comments,
rich text, legal-grade audit trails, task management, auction execution,
spreadsheet-style comparison builders, or ML/AI decision suggestions.
