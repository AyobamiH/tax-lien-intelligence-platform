# Shared Contract KB

## What This File Governs

This file governs shared contracts between the frontend, API, database-facing
services, and scoring package. It prevents UI/API drift.

It does not replace endpoint-specific API docs or implementation tests.

## Current Shared Types

Current shared types in `packages/types`:

- `RuntimeEnvironment`;
- `HealthStatus`;
- `HealthResponse`;
- `ApiErrorResponse`;
- `TenantId`.
- `AuthUserResponse`;
- `AuthSuccessResponse`;
- `AuthMeResponse`;
- `AuthenticatedPrincipal`.
- `DatasetStatus`;
- `DatasetSourceType`;
- `DatasetImportAdapterId`;
- `DatasetImportSource`;
- `DatasetImportConfidence`;
- `DatasetImportSummary`;
- `DatasetValidationSummary`;
- `DatasetResponse`;
- `DatasetListResponse`;
- `DatasetDetailResponse`.
- `PropertyTypeCategory`;
- `NormalizedScoredRecordFields`;
- `EnrichmentAdapterId`;
- `EnrichmentConfidence`;
- `EnrichedFieldName`;
- `EnrichedScoredRecordFields`;
- `EnrichmentSignal`;
- `EnrichmentResult`;
- `ScoredRecordResponse`;
- `InternalJobStatus`;
- `InternalJobType`;
- `InternalJobTargetType`;
- `InternalJobSummary`;
- `InternalJobError`;
- `InternalJobResponse`;
- `MaintenanceDecision`;
- `DatasetMaintenanceMode`;
- `DatasetMaintenanceStatus`;
- `JobDetailResponse`;
- `DatasetScoreJobResponse`;
- `DatasetScoreRunResponse` for internal execution results;
- `DatasetScoresResponse`.
- `AlertType`;
- `AlertSeverity`;
- `AlertStatus`;
- `AlertRelatedEntityType`;
- `AlertMetadata`;
- `AlertResponse`;
- `AlertListResponse`;
- `AlertDetailResponse`;
- `MarkAllAlertsReadResponse`.
- `AddWatchlistItemRequest`;
- `WatchlistItemResponse`;
- `AddWatchlistItemResponse`;
- `WatchlistListResponse`;
- `DeleteWatchlistItemResponse`.
- `PortfolioStatus`;
- `AddPortfolioItemRequest`;
- `UpdatePortfolioItemRequest`;
- `PortfolioItemResponse`;
- `AddPortfolioItemResponse`;
- `PortfolioListResponse`;
- `PortfolioDetailResponse`;
- `UpdatePortfolioItemResponse`;
- `DeletePortfolioItemResponse`.

Current scoring package:

- pure scoreable record and result contracts;
- modular scoring function exports;
- `SCORING_PACKAGE_VERSION`.

## Current Response Shape

Health response shape:

```json
{
  "service": "tax-lien-api",
  "status": "ok",
  "timestamp": "2026-05-24T00:00:00.000Z",
  "environment": "development"
}
```

Error response shape:

```json
{
  "error": {
    "code": "route_not_found",
    "message": "The requested API route does not exist."
  }
}
```

This structured error shape should become the default API pattern.

## Future DTO Direction

Future shared DTOs should be introduced when they cross package/app boundaries.

Likely future DTO families:

- auth request types if the frontend begins importing them;
- parcel row;
- API error codes.

Avoid adding types too early when the domain is still being discovered. Add them
as feature contracts become real.

## Auth Payload Expectations

Current auth response contracts include:

- safe user response;
- auth success response;
- current user response;
- authenticated principal.

Future auth request contracts may include:

- register request;
- login request;
- auth error responses.

Do not expose:

- password hashes;
- JWT secrets;
- internal database fields not intended for clients.

## Error Object Expectations

Future API errors should keep:

- stable `code`;
- safe `message`;
- no stack trace;
- no raw database error;
- no secret;
- no another-tenant details.

Frontend code should branch on stable codes where needed and display safe
messages.

## Dataset Object Direction

Current dataset contracts include:

- dataset id;
- original filename;
- source type;
- optional source label;
- status;
- row count;
- column count;
- headers;
- import summary;
- validation summary;
- upload and created/updated timestamps.

Owner is implied by auth, not client-set. Do not let frontend contracts accept
`userId` for creating datasets.

## Dataset Import Summary Contract

Phase 16 adds a safe import summary contract for dataset responses. It includes:

- whether a county adapter matched;
- adapter id and display name;
- source type: `generic_csv` or `county_adapter`;
- confidence: `low`, `medium`, or `high`;
- whether generic fallback was used;
- mapped canonical field names;
- safe warnings.

Current adapter ids:

- `generic_csv`;
- `maricopa_tax_lien_v1`.

The import summary is browser-safe metadata. It must not expose raw source rows,
file contents, parser internals, county provider payloads, or client-supplied
`userId`. A matched adapter improves deterministic mapping into stored source
rows, but it is not proof of county identity or broad county coverage.

## Parcel Object Direction

Future standalone parcel contracts should include:

- parcel id;
- source dataset id;
- normalized parcel identifier;
- address or location fields if available;
- lien amount;
- estimated value;
- property type;
- validation warnings;
- score summary if computed.

The exact schema should be decided during implementation and documented in API
docs.

## Score Object Contract

Current score contracts include:

- `investmentScore`;
- `riskScore`;
- `liquidityScore`;
- `redemptionProbability`;
- `confidenceScore`;
- optional `valueCoverageRatio`;
- `flags`;
- `reasoning`;
- optional `enrichment`;
- normalized source fields;
- source row number;
- timestamps.

Scores should be server-derived. The client should not submit trusted score
values.

Current score routes return:

- `DatasetScoreJobResponse` from `POST /datasets/:datasetId/score`;
- `DatasetRefreshJobResponse` from `POST /datasets/:datasetId/refresh`;
- `DatasetScoringStatusResponse` from
  `GET /datasets/:datasetId/scoring-status`;
- `DatasetScoresResponse` from `GET /datasets/:datasetId/scores`.

`POST /datasets/:datasetId/score` returns queued job metadata. The frontend
uses `GET /jobs/:jobId` and then `GET /datasets/:datasetId/scores` after the
worker completes scoring.

`POST /datasets/:datasetId/refresh` returns queued job metadata or the active
queued/running dataset job when refresh is already in progress. It must not
create duplicate refresh jobs for repeated user actions.

`DatasetScoringStatusResponse` includes a `maintenance` object with manual-only
versus policy-auto-refresh mode, eligibility, and a safe user-facing message. It
must not expose raw scheduler internals.

`DatasetScoreRunResponse` remains the internal execution result shape used by
the scoring service and tests, not the public score-trigger response.

The Phase 5 frontend review surface imports these shared response types and
does not define a separate browser-only score contract.

The contract represents first-pass explainable scoring, not final underwriting.

## Enrichment Object Contract

Current enrichment contracts include:

- adapter ids;
- orchestration version;
- adapter outcomes with stage, status, safe message, and timestamps;
- freshness metadata with source version and reprocess timing;
- data quality score;
- inferred field snapshot;
- optional safe external enrichment results;
- signals with field, confidence, and safe message;
- safe flags;
- safe reasoning.

Current adapter ids:

- `source_field_inference`.
- `census_geocoder`.

The frontend may display enrichment context, but it must not treat enrichment as
final underwriting truth. External enrichment responses may expose normalized
address/location context, provider tag, confidence, status, and timestamp. They
must not expose raw source rows, stack traces, provider payloads, request
internals, or secrets.

## Internal Job Contract

Current job contracts include:

- job id;
- type;
- target entity type;
- target entity id;
- request kind: `score`, `refresh`, `policy_refresh`, or `maintenance_scan`;
- status;
- optional safe summary;
- optional safe error;
- queued/started/completed/failed timestamps;
- created/updated timestamps.

Current job types:

- `dataset_scoring`.
- `dataset_maintenance`.

Current target entity type:

- `dataset`.

Jobs are user-owned operational metadata. The frontend must not submit `userId`
or raw job payloads, and job responses must not expose raw internals.

Phase 10 adds worker claiming for queued jobs. This changes execution timing,
but not the public job response contract.

Phase 14 adds refresh request metadata and dataset scoring status states. The
status response is a safe user-facing summary, not a raw job log.

Phase 15 adds safe maintenance summary fields for scanned/stale/skipped counts,
maintenance decision, policy mode, and optional follow-on refresh job id. Policy
refresh jobs must remain distinguishable from manual refresh jobs.

## Alert Object Contract

Current alert contracts include:

- alert id;
- type;
- severity;
- read/unread status;
- safe human-readable message;
- optional related entity type/id;
- optional safe metadata;
- created/updated timestamps;
- optional read timestamp.

Current alert types:

- `scoring_job_completed`;
- `scoring_job_failed`.

Current alert metadata is limited to safe identifiers and summary values:

- job id;
- dataset id;
- scored record count;
- stable error code.
- request kind.

Alert contracts must not expose raw job payloads, stack traces, source rows,
tokens, secrets, provider responses, or another tenant's data. External delivery
contracts are not implemented.

## Watchlist Object Contract

Current watchlist contracts include:

- watchlist item id;
- source dataset id;
- source scored record id;
- source row number;
- normalized field snapshot;
- score summary;
- flags;
- reasoning;
- scored timestamp;
- added timestamp;
- created/updated timestamps.

The backend verifies the watched scored record belongs to the authenticated user
before creating a watchlist item. The frontend must not submit score values or
`userId`.

Future watchlist contracts may add notes, tags, or decision status, but only
with validation, API docs, and tenancy tests.

## Portfolio Object Contract

Current portfolio contracts include:

- portfolio item id;
- source dataset id;
- source scored record id;
- optional source watchlist item id;
- status;
- status update timestamp;
- source row number;
- normalized field snapshot;
- score summary;
- flags;
- reasoning;
- scored timestamp;
- tracked timestamp;
- created/updated timestamps.

Portfolio creation accepts exactly one owned `scoredRecordId` or one owned
`watchlistItemId`. The backend verifies ownership and creates the score snapshot.
The frontend must not submit score values or `userId`.

Current status values are `tracked`, `reviewing`, `ready`, `acquired`, `closed`,
and `discarded`.

Future portfolio contracts may add notes, tags, alerts, or richer decision
history, but only with validation, API docs, and tenancy tests.

## Compatibility And Versioning Guidance

Because this is early, contract churn is acceptable only when paired with:

- code changes;
- tests;
- docs;
- changelog entries.

Once real users exist, contract changes should be backward-compatible where
possible or explicitly versioned.

## Anti-Drift Rules

- Do not duplicate API contracts only in frontend components.
- Do not let API responses grow undocumented fields that UI depends on silently.
- Do not let package types describe future fields as current response fields.
- Do not add client-supplied `userId` to create/update DTOs for user-owned data.
- Do not represent scoring as a single number once explainable scoring exists.
- Do not treat alert metadata as a raw logging or diagnostic payload.
- Do not let enrichment contracts imply external verification when enrichment is
  only internal source-row inference.
- Do not let an import adapter summary imply broad county coverage or live
  county verification.

## Security Contract Rules

Shared contracts must not expose:

- password hashes;
- secrets;
- raw internal errors;
- raw alert/job internals;
- another user's identifiers;
- admin-only fields;
- server-derived trust fields as client-writable inputs.

## Update Rules

Update this file when:

- shared types change;
- endpoint contracts are introduced;
- error shapes change;
- scoring output shape is implemented;
- frontend/API contract boundaries change.
