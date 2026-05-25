# Backend Direction KB

## What This File Governs

This file governs backend direction: API responsibilities, service boundaries,
validation philosophy, error philosophy, and implementation order.

It does not define exact endpoint schemas. Endpoint schemas belong in `docs/api`
and shared DTO types.

## Current Backend Reality

Current implementation:

- Express app factory;
- Helmet middleware;
- CORS middleware;
- JSON body limit of `1mb`;
- `GET /healthz`;
- user model;
- `POST /auth/register`;
- `POST /auth/login`;
- `GET /auth/me`;
- password hashing;
- JWT issuance and verification;
- auth middleware;
- global API error handling;
- dataset model;
- authenticated dataset upload/list/detail routes;
- CSV upload handling;
- CSV validation and dataset ownership enforcement;
- internal dataset source rows for scoring;
- scored-record model;
- deterministic scoring package integration;
- authenticated score run and score retrieval routes;
- scoring ownership enforcement;
- frontend score review surface consumes the scoring API;
- watchlist item model;
- authenticated watchlist add/list/remove routes;
- watchlist ownership enforcement against scored records;
- duplicate-safe watchlist adds;
- portfolio item model;
- authenticated portfolio add/list/detail/status/delete routes;
- portfolio ownership enforcement against scored records and watchlist items;
- duplicate-safe portfolio adds;
- simple portfolio status model;
- structured 404;
- startup connects to MongoDB;
- env parsing with `zod`;
- no standalone parcel/lien models.

## Intended Backend Role

The backend should become the trusted boundary for:

- authentication;
- tenant identity;
- dataset ingestion;
- validation;
- normalized storage;
- scoring orchestration;
- watchlist persistence;
- portfolio tracking persistence;
- audit events;
- security enforcement.

The backend must not rely on frontend behavior for authorization.

## Auth Implementation

Phase 2 introduced:

- user model;
- registration endpoint;
- login endpoint;
- password hashing;
- JWT issuance;
- JWT verification middleware;
- `GET /auth/me`;
- protected-route tests;
- duplicate email handling;
- invalid/malformed payload handling;
- expired/invalid token handling.

Security requirement:

- server derives the authenticated user from the verified token;
- client-supplied `userId` is never trusted.

Future auth hardening may add password reset, email verification, refresh-token
rotation, or MFA, but those are not current scope.

## Dataset Implementation

The dataset foundation now exists. A dataset belongs to exactly one user and
captures upload metadata and validation outcome.

Current backend responsibilities:

- validate file presence;
- validate file type/size;
- parse CSV safely;
- reject empty or malformed CSVs;
- record validation summaries;
- avoid persistence on unsafe parse failures;
- associate every stored dataset with `userId`.

Future backend responsibilities:

- normalize parcel/lien rows;
- validate required domain fields;
- handle duplicate parcel identities;
- persist row-level records safely.

## Scoring Implementation

The backend now calls the pure scoring package rather than embedding scoring
logic directly in route handlers.

The scoring package is deterministic and independently tested. The API persists
score outputs with reasoning and flags in tenant-owned scored records.

Current scoring API:

- `POST /datasets/:datasetId/score`;
- `GET /datasets/:datasetId/scores`.

Current limitation:

- scoring is first-pass and conservative;
- normalization maps common headers only;
- no external enrichment or final underwriting model exists yet.

## Watchlist Implementation

The watchlist foundation now exists. Watchlist items belong to one user and
reference scored records that have already passed dataset ownership checks.

Current watchlist API:

- `POST /watchlist`;
- `GET /watchlist`;
- `DELETE /watchlist/:watchlistItemId`.

Watchlist endpoints:

- require auth;
- verify ownership of the scored record being watched;
- prevent cross-user references;
- support add/remove/list;
- preserve user decision context.

Current limitation:

- no notes, tags, alerts, collaboration, or auction execution.

## Portfolio Implementation

The portfolio foundation now exists. Portfolio items belong to one user and
reference either an owned scored record or an owned watchlist item.

Current portfolio API:

- `POST /portfolio`;
- `GET /portfolio`;
- `GET /portfolio/:portfolioItemId`;
- `PATCH /portfolio/:portfolioItemId`;
- `DELETE /portfolio/:portfolioItemId`.

Portfolio endpoints:

- require auth;
- verify ownership of the scored record or watchlist item being tracked;
- prevent cross-user references;
- support add/list/detail/status/delete;
- preserve score context, flags, reasoning, and a status timestamp;
- do not imply financial performance guarantees.

Current limitation:

- no notes, tags, alerts, collaboration, auction execution, accounting, or
  realized-return tracking.

## Service Boundaries

Preferred backend boundaries:

- route layer handles HTTP shape;
- validation layer parses input;
- service layer handles business logic;
- model/data layer handles persistence;
- scoring package handles pure underwriting calculations;
- shared types define API contracts where appropriate.

Avoid large route handlers that combine validation, persistence, scoring, and
authorization in one place.

## Validation Philosophy

Validate every external input:

- request bodies;
- route params;
- query params;
- auth headers;
- CSV file fields;
- numeric ranges;
- enum values;
- object IDs.

Use schema validation where possible. `zod` is already present and should be
used consistently.

## Error Philosophy

Errors should be structured and safe:

```json
{
  "error": {
    "code": "example_error_code",
    "message": "Human-readable safe message."
  }
}
```

Do not expose:

- stack traces;
- raw database errors;
- secrets;
- file contents;
- another tenant's identifiers.

## Jobs And Workers Direction

No jobs/workers exist today.

Future automation may need background processing for large files, enrichment, or
alerts. That should wait until core ingestion and scoring are stable.

When introduced, background work must include:

- tenant ownership;
- idempotency;
- failure state;
- observability;
- rate/size limits;
- safe retry behavior.

## Implementation Order

Backend implementation order should stay disciplined:

1. auth and user model: implemented in Phase 2;
2. tenant-scoped dataset model and CSV upload: implemented in Phase 3;
3. parcel/lien normalization;
4. scoring package implementation and score APIs: implemented in Phase 4;
5. frontend scored-results table: implemented in Phase 5;
6. watchlist APIs and review surface: implemented in Phase 6;
7. portfolio APIs and status surface: implemented in Phase 7;
8. later automation.

Do not introduce automation before the manual workflow is correct.

## What Not To Overbuild Too Early

Avoid:

- generic job systems before uploads exist;
- complex roles before single-user tenancy is secure;
- admin APIs before audit/security controls;
- AI workflows before deterministic scoring;
- portfolio performance tracking before basic portfolio status tracking.

## Security Expectations

Every backend feature must include:

- auth decision;
- validation schema;
- ownership check if user-owned;
- tests for invalid input;
- tests for unauthorized access;
- docs;
- safe error behavior.

## Drift Risks

Backend drift risks:

- route handlers growing without service boundaries;
- client-supplied `userId`;
- unvalidated parcel/lien row ingestion;
- scoring logic duplicated outside the scoring package;
- inconsistent error shapes;
- permissive CORS into production;
- hidden assumptions that are not tested.

## Update Rules

Update this file when:

- backend architecture changes;
- new endpoint groups are added;
- service boundaries change;
- auth or tenant enforcement changes;
- jobs/workers become real.
