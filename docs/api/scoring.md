# Scoring API

Phase 4 adds the first explainable scoring foundation. Scoring routes are
authenticated, tenant-scoped, and operate only on datasets owned by the
authenticated user.

## Security Model

- All scoring routes require `Authorization: Bearer <jwt-access-token>`.
- Dataset ownership is checked before scoring or score retrieval.
- The client cannot submit trusted score values.
- Scored records are derived server-side from stored dataset source rows.
- Cross-user access returns `dataset_not_found` rather than revealing another
  user's dataset exists.
- Scoring explanations are user-visible summaries, not raw processing internals.

## `POST /datasets/:datasetId/score`

Runs first-pass scoring for a user-owned dataset.

The current scoring run is synchronous and deterministic. It refreshes existing
scores for the same dataset from stored source rows while preserving scored
record identifiers for the same source row where possible, so watchlist
references can remain stable across rescoring.

### Response `200`

```json
{
  "datasetId": "dataset-id",
  "scoredRecordCount": 2,
  "scores": [
    {
      "id": "score-id",
      "datasetId": "dataset-id",
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
        "Residential property type usually has stronger resale and redemption signals.",
        "Very strong value coverage ratio (12x) indicates a large safety margin."
      ],
      "scoredAt": "2026-05-25T00:00:00.000Z",
      "createdAt": "2026-05-25T00:00:00.000Z",
      "updatedAt": "2026-05-25T00:00:00.000Z"
    }
  ]
}
```

## `GET /datasets/:datasetId/scores`

Returns stored scored records for a user-owned dataset.

### Response `200`

```json
{
  "datasetId": "dataset-id",
  "scores": []
}
```

If scoring has not been run yet, the route returns an empty `scores` array.

## Scoring Error Codes

Possible scoring errors:

- `auth_missing_token`
- `auth_invalid_header`
- `auth_invalid_token`
- `dataset_invalid_id`
- `dataset_not_found`
- `score_no_source_rows`

## Current Limitation

Phase 4 scoring is a first-pass, rule-based foundation. It is not a final
institutional underwriting model. It uses only fields that can be mapped from
the uploaded dataset, such as parcel id, lien amount, estimated or assessed
value, property type, and any simple usability signals present in the CSV.

Phase 5 adds a frontend review surface that calls these routes directly for the
signed-in user. Phase 6 adds watchlist actions on top of scored records. Future
phases may add stronger county adapters, enrichment, deduplication, geographic
data, historical redemption signals, and portfolio workflows.
