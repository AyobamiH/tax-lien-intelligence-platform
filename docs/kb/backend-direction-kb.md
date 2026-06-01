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
- county import adapter boundary for uploaded CSV rows;
- first Maricopa-style tax lien CSV adapter with generic fallback;
- safe import summary metadata on dataset responses;
- dataset readiness summary with canonical field coverage, issues, score,
  scoring recommendation, and guidance;
- internal dataset source rows for scoring;
- scored-record model;
- internal job model;
- enrichment service and source-field inference adapter;
- deterministic scoring package integration;
- authenticated score run and score retrieval routes;
- score runs routed through queued internal jobs and the worker execution path;
- authenticated job detail route;
- dedicated worker entrypoint;
- minimal scheduler module;
- alert model;
- authenticated alert list/read/read-all routes;
- scoring job completion/failure alert creation;
- scheduled maintenance service for stale scored-record scans;
- `dataset_maintenance` job type for policy-driven maintenance decisions;
- policy-created `dataset_scoring` refresh jobs with
  `requestKind: "policy_refresh"`;
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
- internal job orchestration;
- watchlist persistence;
- portfolio tracking persistence;
- in-app alert persistence;
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
- apply the current county import adapter boundary when headers match explicit
  evidence;
- reject empty or malformed CSVs;
- record validation summaries;
- record safe import summaries;
- record safe readiness summaries;
- avoid persistence on unsafe parse failures;
- associate every stored dataset with `userId`.

Future backend responsibilities:

- normalize parcel/lien rows;
- add tested county adapters behind the existing import adapter boundary;
- validate required domain fields;
- handle duplicate parcel identities;
- persist row-level records safely.

## Scoring Implementation

The backend now calls the pure scoring package rather than embedding scoring
logic directly in route handlers.

The scoring package is deterministic and independently tested. The API persists
score outputs with reasoning, flags, and safe enrichment metadata in
tenant-owned scored records. Scoring runs now execute through a persisted
internal `dataset_scoring` job that is claimed and processed by the worker.

Current scoring API:

- `POST /datasets/:datasetId/score`;
- `POST /datasets/:datasetId/refresh`;
- `GET /datasets/:datasetId/scoring-status`;
- `GET /datasets/:datasetId/scores`.

The scoring trigger now returns queued job metadata. The refresh trigger queues
or reuses a dataset scoring job with `requestKind: "refresh"`. The frontend
polls job state and fetches scores after the worker completes the job.

Current limitation:

- scoring is first-pass and conservative;
- enrichment now includes uploaded source-row inference plus an opt-in Census
  Geocoder adapter for address normalization/location context;
- county import now includes one Maricopa-style CSV adapter before generic
  normalization and scoring;
- no broad external provider coverage or final underwriting model exists yet.

## County Import Adapter Implementation

Phase 16 adds a dataset import adapter boundary after safe CSV parsing and
before dataset persistence. The current adapter list is intentionally small:

- `maricopa_tax_lien_v1` for Maricopa-style tax lien CSV headers;
- `generic_csv` fallback for all other uploads.

The adapter may add canonical internal fields such as `parcel_id`,
`lien_amount`, `estimated_value`, `property_type`, and `address` to stored
source rows when APN-style evidence and supporting headers are present. Dataset
API responses expose only safe import summary metadata: adapter id/name,
confidence, mapped fields, and warnings. They do not expose raw source rows.

Current limitation:

- no broad county adapter catalog;
- no live county sync;
- no scraping;
- no ML/AI import classification.

## Import Readiness Implementation

Phase 18 adds a backend-computed readiness layer for datasets. It runs after
CSV parsing and county adapter handling, then stores a safe readiness summary on
the dataset.

Current readiness output:

- status: `ready`, `partial`, `weak`, or `blocked`;
- 0-100 readiness score;
- scoring recommendation boolean;
- canonical field coverage for parcel identifier, lien amount, estimated value,
  property type, and address context;
- safe dataset-level issues;
- user-facing guidance.

Readiness treats lien amount and estimated value as required. Parcel identifier,
property type, and address context improve confidence but missing parcel
identifiers are warnings rather than hard blockers.

Current limitation:

- no manual field-mapping editor;
- no spreadsheet transformation workflow;
- no broad county adapter coverage;
- no ML/AI import classification.

## Enrichment Implementation

The enrichment foundation now exists as a backend-only source-row processing
layer between normalization and scoring.

Current implementation:

- enrichment adapter interface;
- enrichment service and explicit orchestration layer;
- `source_field_inference` adapter;
- `census_geocoder` external adapter, disabled unless configured;
- adapter outcomes for success, skipped, partial, and failed enrichment;
- enrichment freshness metadata with reprocess-after timing;
- controlled refresh/reprocessing requests that rerun scoring/enrichment
  through the existing worker job path;
- scheduled maintenance scanning that uses freshness metadata to find stale
  datasets and apply explicit refresh policy;
- enrichment result persisted on scored records;
- worker scoring path applies normalization, enrichment, then scoring;
- adapter failure handling records safe enrichment metadata and keeps scoring
  conservative.

Current adapter capabilities:

- infer missing parcel id, lien amount, estimated value, property type, and
  address from alternate uploaded headers;
- derive value from land plus improvement components when both are available;
- compute data-quality score for mapped fields.
- call the U.S. Census Geocoder for bounded, opt-in address normalization and
  location context when a normalized address is available.
- record disabled, no-match, timeout, and failed provider states as deliberate
  fallback metadata rather than hidden errors.

Current limitation:

- no provider sprawl or paid-service dependency;
- no external valuation provider;
- no ML/AI enrichment;
- no county-specific live integration.
- no unlimited autonomous refresh or broad sync automation.
- no user-facing scheduler policy editor.

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

## Alerts Implementation

The alerts foundation now exists as in-app user-owned monitoring records.

Current alert API:

- `GET /alerts`;
- `PATCH /alerts/:alertId/read`;
- `PATCH /alerts/read-all`.

Alert endpoints:

- require auth;
- scope reads and updates by authenticated `userId`;
- expose safe event summaries only;
- support unread/read state;
- do not provide external delivery.

Current alert sources:

- completed `dataset_scoring` jobs;
- failed `dataset_scoring` jobs.

Current limitation:

- no email/SMS delivery;
- no realtime websocket feed;
- no scheduled alert generation;
- no admin monitoring dashboard.

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

Internal job and worker plumbing exists today. It is not external automation.

Current job implementation:

- tenant-owned internal job model;
- `dataset_scoring` job type;
- `dataset_maintenance` job type;
- `dataset` target entity type;
- request kind metadata for normal scoring, controlled refresh, maintenance
  scans, and policy refresh;
- queued/running/completed/failed lifecycle;
- duplicate-safe active job lookup for refresh requests;
- stale scored-record scanning and policy-gated maintenance jobs;
- explicit maintenance policy with manual-only default, per-run cap, minimum
  refresh interval, and failed-refresh suppression window;
- authenticated `GET /jobs/:jobId`;
- worker-side queued job claiming;
- dedicated worker entrypoint for dataset scoring execution;
- minimal scheduler module used for local job polling;
- safe summary and error metadata.

Future automation may need background processing for large files, enrichment, or
alerts. That should build on the job model rather than hiding work inside route
handlers.

Alerts are now the first user-facing visibility layer on top of job outcomes.
Future alert sources should call the alert service with safe metadata rather
than exposing raw job internals.

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
8. automation-ready internal job plumbing: implemented in Phase 8;
9. alerts and monitoring foundation: implemented in Phase 9;
10. background worker and scheduler groundwork: implemented in Phase 10;
11. enrichment adapter foundation: implemented in Phase 11;
12. controlled refresh/reprocessing workflow: implemented in Phase 14;
13. scheduled maintenance and policy-driven auto-refresh foundation:
    implemented in Phase 15;
14. county import adapter foundation: implemented in Phase 16;
15. browser upload workflow: implemented in Phase 17;
16. import validation and scoring-readiness workflow: implemented in Phase 18;
17. later external automation.

Do not introduce automation before the manual workflow is correct.

## What Not To Overbuild Too Early

Avoid:

- generic distributed job systems before the current worker boundary needs them;
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
- treating one county adapter as broad county coverage;
- treating readiness summaries as manual remapping or final data correctness;
- trusting filenames or user labels as county proof;
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
- job types or worker execution change.
