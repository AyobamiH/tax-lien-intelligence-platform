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
- `DatasetValidationSummary`;
- `DatasetResponse`;
- `DatasetListResponse`;
- `DatasetDetailResponse`.
- `PropertyTypeCategory`;
- `NormalizedScoredRecordFields`;
- `ScoredRecordResponse`;
- `DatasetScoreRunResponse`;
- `DatasetScoresResponse`.
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
- validation summary;
- upload and created/updated timestamps.

Owner is implied by auth, not client-set. Do not let frontend contracts accept
`userId` for creating datasets.

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
- normalized source fields;
- source row number;
- timestamps.

Scores should be server-derived. The client should not submit trusted score
values.

Current score routes return `ScoredRecordResponse` objects through:

- `DatasetScoreRunResponse`;
- `DatasetScoresResponse`.

The Phase 5 frontend review surface imports these shared response types and
does not define a separate browser-only score contract.

The contract represents first-pass explainable scoring, not final underwriting.

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

## Security Contract Rules

Shared contracts must not expose:

- password hashes;
- secrets;
- raw internal errors;
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
