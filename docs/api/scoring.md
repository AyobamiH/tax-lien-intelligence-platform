# Scoring API

Phase 4 adds the first explainable scoring foundation. Scoring routes are
authenticated, tenant-scoped, and operate only on datasets owned by the
authenticated user.

## Security Model

- All scoring routes require `Authorization: Bearer <jwt-access-token>`.
- Dataset ownership is checked before scoring or score retrieval.
- The client cannot submit trusted score values.
- Scored records are derived server-side from stored dataset source rows after
  normalization and enrichment.
- Cross-user access returns `dataset_not_found` rather than revealing another
  user's dataset exists.
- Scoring explanations are user-visible summaries, not raw processing internals.

## `POST /datasets/:datasetId/score`

Enqueues first-pass scoring for a user-owned dataset through the internal job
execution layer.

Phase 10 moves score execution out of the request lifecycle. The route now
creates a persisted `dataset_scoring` job and returns the queued job. A dedicated
worker claims and executes the job, then records completed or failed lifecycle
state.

### Response `202`

```json
{
  "datasetId": "dataset-id",
  "job": {
    "id": "job-id",
    "type": "dataset_scoring",
    "targetEntityType": "dataset",
    "targetEntityId": "dataset-id",
    "status": "queued",
    "queuedAt": "2026-05-25T00:00:00.000Z",
    "createdAt": "2026-05-25T00:00:00.000Z",
    "updatedAt": "2026-05-25T00:00:00.000Z"
  }
}
```

Use `GET /jobs/:jobId` to check job state and `GET /datasets/:datasetId/scores`
to retrieve scores after the worker marks the job completed.

## `GET /datasets/:datasetId/scores`

Returns stored scored records for a user-owned dataset.

### Response `200`

```json
{
  "datasetId": "dataset-id",
  "scores": [
    {
      "id": "score-id",
      "datasetId": "dataset-id",
      "sourceRowNumber": 1,
      "normalizedFields": {
        "parcelId": "A-100",
        "lienAmount": 1000,
        "estimatedValue": 12000,
        "propertyType": "Single family residence",
        "propertyTypeCategory": "residential",
        "address": "10 Main St Austin, TX 78701"
      },
      "enrichment": {
        "adapters": ["source_field_inference", "census_geocoder"],
        "orchestrationVersion": "enrichment-orchestration-v1",
        "enrichedAt": "2026-05-25T00:00:00.000Z",
        "adapterOutcomes": [
          {
            "adapterId": "source_field_inference",
            "stage": "internal",
            "status": "success",
            "message": "Adapter completed successfully.",
            "startedAt": "2026-05-25T00:00:00.000Z",
            "completedAt": "2026-05-25T00:00:00.000Z"
          },
          {
            "adapterId": "census_geocoder",
            "stage": "external",
            "status": "success",
            "message": "Adapter completed with an external match.",
            "startedAt": "2026-05-25T00:00:00.000Z",
            "completedAt": "2026-05-25T00:00:00.000Z"
          }
        ],
        "freshness": {
          "status": "fresh",
          "enrichedAt": "2026-05-25T00:00:00.000Z",
          "staleAt": "2026-06-24T00:00:00.000Z",
          "reprocessAfter": "2026-06-24T00:00:00.000Z",
          "reprocessEligible": false,
          "sourceVersion": "source_field_inference@1+census_geocoder@Public_AR_Current"
        },
        "dataQualityScore": 100,
        "inferredFields": {
          "lienAmount": 1000,
          "estimatedValue": 12000
        },
        "externalResults": [
          {
            "adapterId": "census_geocoder",
            "provider": "us_census_geocoder",
            "status": "matched",
            "confidence": "medium",
            "message": "Census Geocoder matched and normalized the address.",
            "normalizedAddress": "10 MAIN ST, AUSTIN, TX, 78701",
            "latitude": 30.2672,
            "longitude": -97.7431,
            "benchmark": "Public_AR_Current",
            "enrichedAt": "2026-05-25T00:00:00.000Z"
          }
        ],
        "signals": [
          {
            "adapterId": "source_field_inference",
            "field": "lienAmount",
            "confidence": "high",
            "message": "Lien amount inferred from alternate tax/lien amount headers."
          }
        ],
        "flags": [],
        "reasoning": ["Enrichment inferred lien amount from alternate amount headers."]
      },
      "investmentScore": 82,
      "riskScore": 18,
      "liquidityScore": 75,
      "redemptionProbability": 0.8,
      "confidenceScore": 75,
      "valueCoverageRatio": 12,
      "flags": [],
      "reasoning": [],
      "scoredAt": "2026-05-25T00:00:00.000Z",
      "createdAt": "2026-05-25T00:00:00.000Z",
      "updatedAt": "2026-05-25T00:00:00.000Z"
    }
  ]
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

Errors discovered before enqueue, such as invalid dataset ids or cross-user
dataset access, return immediately. Errors discovered by the worker after enqueue
are recorded on the job as safe failure metadata.

## Current Limitation

Phase 4 scoring is a first-pass, rule-based foundation. Phase 11 adds internal
source-row enrichment before scoring. Phase 12 adds an opt-in U.S. Census
Geocoder adapter for address normalization and location context. Phase 13 adds
explicit enrichment orchestration, fallback outcomes, and freshness/reprocess
metadata. Scoring is still not a final institutional underwriting model. It uses
fields that can be mapped or safely inferred from the uploaded dataset, plus
safe external enrichment metadata when the Census provider is enabled.

Phase 5 adds a frontend review surface that calls these routes directly for the
signed-in user. Phase 6 adds watchlist actions on top of scored records. Phase 7
adds portfolio/status tracking for scored records or promoted watchlist items.
Phase 8 adds internal job plumbing around scoring. Phase 9 adds in-app alerts
for scoring job completion/failure outcomes. Phase 10 adds a dedicated worker
execution path for scoring jobs. Phase 11 adds an internal enrichment adapter
layer. Phase 12 proves one external enrichment path through the Census Geocoder.
Phase 13 makes enrichment operationally explicit and rerun-ready. Future phases
may add stronger county adapters, additional providers, deduplication,
historical redemption signals, external alert delivery, and external
automation.
