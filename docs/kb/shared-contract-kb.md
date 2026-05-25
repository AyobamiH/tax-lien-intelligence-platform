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

Current scoring package:

- no score contract yet;
- only `SCORING_PACKAGE_VERSION`.

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

Likely DTO families:

- auth request/response;
- current user response;
- dataset upload response;
- dataset summary;
- parcel row;
- score output;
- watchlist item;
- API error codes.

Avoid adding types too early when the domain is still being discovered. Add them
as feature contracts become real.

## Auth Payload Expectations

Future auth contracts should include:

- register request;
- login request;
- auth success response;
- safe user response;
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

Future dataset contracts should include:

- dataset id;
- upload filename if safe;
- row count;
- validation status;
- created timestamp;
- owner implied by auth, not client-set.

Do not let frontend contracts accept `userId` for creating datasets.

## Parcel Object Direction

Future parcel contracts should include:

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

## Score Object Direction

Future score contracts should include:

- `investmentScore`;
- `riskScore`;
- `liquidityScore`;
- `redemptionProbability`;
- `flags`;
- `reasoning`;
- confidence or missing-data warnings if implemented.

Scores should be server-derived. The client should not submit trusted score
values.

## Watchlist Object Direction

Future watchlist contracts should include:

- watchlist item id;
- parcel id;
- score snapshot or score reference;
- user decision status if implemented;
- notes if implemented;
- created/updated timestamps.

The backend must verify the watched parcel belongs to the authenticated user.

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
