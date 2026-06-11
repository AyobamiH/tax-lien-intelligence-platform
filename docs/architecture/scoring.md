# Scoring Foundation Architecture

Phase 29 makes scoring and scoring-status access workspace-aware. Active
members can read results/status; only owners/admins can start scoring or
refresh. The worker continues using the derived owner compatibility tenant key.

## Scope

Phase 4 introduces the first real scoring layer. It converts stored dataset
source rows into server-derived scored records with normalized fields, scores,
flags, reasoning, and data-confidence signals.

Implemented:

- pure scoring package in `packages/scoring`;
- modular scoring functions for value coverage, property type, access,
  liquidity, redemption probability, and final score composition;
- internal dataset source row persistence for uploaded CSV rows;
- county import adapter boundary with one Maricopa-style CSV adapter and generic
  fallback;
- scored record Mongo model;
- row normalization from common CSV column names;
- enrichment service and source-field inference adapter;
- authenticated `POST /datasets/:datasetId/score`;
- authenticated `POST /datasets/:datasetId/refresh`;
- authenticated `GET /datasets/:datasetId/scoring-status`;
- authenticated `GET /datasets/:datasetId/scores`;
- internal `dataset_scoring` job record created for score runs;
- dedicated worker execution path for queued scoring jobs;
- in-app alerts for completed/failed scoring jobs;
- refresh job request-kind metadata and duplicate-safe active job reuse;
- maintenance policy metadata in scoring status responses;
- policy-created refresh jobs with `requestKind: "policy_refresh"` when server
  maintenance policy explicitly allows it;
- tenant ownership checks for scoring and retrieval;
- frontend scored-results review surface;
- score identifiers preserved across rescoring of the same source row where
  possible so watchlist references remain stable;
- unit tests for scoring rules;
- integration tests for scoring API ownership and weak-data behavior.

Not implemented:

- final institutional-grade underwriting;
- broad external enrichment provider coverage;
- ML or AI scoring;
- broad county-specific adapter coverage.

## Data Flow

1. The user uploads a CSV through the Phase 3 dataset endpoint.
2. The parser validates the CSV.
3. The county import adapter boundary may add canonical internal fields when the
   Maricopa-style adapter matches, or use generic CSV fallback.
4. The dataset service stores sanitized source rows internally on the dataset
   record.
5. The public dataset response returns metadata, validation summary, and safe
   import summary metadata.
6. The scoring or refresh route verifies the dataset belongs to the
   authenticated user and enqueues a `dataset_scoring` job.
7. The worker claims the queued job and revalidates the dataset target.
8. Each stored source row is normalized into scoreable fields.
9. The enrichment service infers missing fields and data-quality context from
   safe source-row aliases.
10. The pure scoring package produces a deterministic score result.
11. The API persists scored records with `userId`, `datasetId`, normalized fields,
   enrichment metadata, flags, reasoning, and timestamps.

## Scoring Package Boundary

`packages/scoring` owns pure underwriting-style calculations. It does not know
about Express, MongoDB, authentication, or HTTP responses.

Current exported functions include:

- `calculateValueCoverage`;
- `assessPropertyType`;
- `evaluateAccess`;
- `computeLocationScore`;
- `estimateRedemptionProbability`;
- `computeLiquidity`;
- `scoreLienCandidate`.

This keeps scoring independently testable and prevents route handlers from
becoming the source of scoring truth.

## First-Pass Factors

The current scoring model uses only fields that may be present in uploaded data:

- parcel identifier presence;
- positive lien amount;
- positive estimated, assessed, or market value;
- value coverage ratio;
- property type category;
- simple access, buildability, and utility signals if present;
- missing-data confidence.

It produces:

- `investmentScore` from 0 to 100;
- `riskScore` from 0 to 100;
- `liquidityScore` from 0 to 100;
- `redemptionProbability` from 0 to 1;
- `confidenceScore` from 0 to 100;
- optional `valueCoverageRatio`;
- flags;
- reasoning.

## Conservative Scoring Rules

The model is intentionally conservative when data is weak.

Examples:

- missing lien amount or property value lowers confidence and score;
- unknown property type caps the investment score;
- value coverage below 1 caps investment score and adds `DO NOT BID`;
- no road access caps investment score near zero;
- vacant land is heavily penalized unless future enrichment proves quality.

This is not fake precision. Missing data is a product signal, not something the
scoring engine should hide.

## Normalization Boundary

Normalization maps common CSV headers into scoreable fields. It supports common
variants such as:

- `parcel_id`, `parcel id`, `apn`;
- `lien_amount`, `amount due`, `minimum bid`;
- `estimated_value`, `market value`, `assessed value`;
- `property_type`, `land use`, `class`;
- simple usability columns such as `road access`, `buildable`, and `utilities`.

Headers are not trusted as perfect county schemas. Unmapped fields produce
warnings and conservative scoring behavior.

## Enrichment Boundary

Phase 11 adds enrichment after normalization and before scoring. Phase 12 adds
one controlled external enrichment path. Current adapters are
`source_field_inference` and, when enabled, `census_geocoder`.

`source_field_inference` can infer:

- parcel identifiers from alternate aliases;
- lien amounts from alternate tax/lien amount headers;
- property value from total assessed/market value fields or land plus
  improvement components;
- property type from use/classification descriptions;
- address from alternate or component address fields;
- data-quality score for mapped core fields.

`census_geocoder` can record safe U.S. Census Geocoder address/location context
when explicitly enabled. It is bounded by timeout and per-job row limits and
does not store raw provider payloads.

Internal source-field enrichment fills missing or unknown fields. External
enrichment is limited to explicitly configured adapters such as the current
Census Geocoder path. Enrichment does not use ML/AI or override clearly mapped
source fields with speculative values.

## Persistence Boundary

Datasets remain the upload/source container. Scored records are separate
server-derived documents with:

- `userId`;
- `datasetId`;
- source row number;
- normalized fields;
- enrichment metadata;
- scoring output;
- `scoredAt`;
- timestamps.

Scores are refreshed for a dataset when a new scoring run or controlled refresh
occurs. Existing scored-record identifiers are preserved for the same `userId`,
`datasetId`, and source row number where possible, because Phase 6 watchlist
items reference scored records. Rows no longer present in the scoring run are
removed.

Phase 15 scheduled maintenance can queue refresh indirectly. Maintenance jobs
do not score directly; they verify ownership, count stale scored records,
evaluate duplicate and suppression gates, and only then may enqueue a
`policy_refresh` scoring job. That keeps scheduled refresh decisions visible in
job metadata instead of hiding them inside request handlers.

## Security Notes

Scoring is tenant-owned user-data processing.

The API:

- requires auth;
- derives `userId` from the token;
- verifies dataset ownership before scoring;
- scopes score reads by `userId` and `datasetId`;
- does not accept client-submitted scores;
- does not return raw CSV rows in dataset metadata responses.
- returns an active queued/running dataset job rather than creating duplicate
  refresh work.
- distinguishes policy-created refresh from manual refresh with `requestKind`.

Remaining hardening:

- rate limits for repeated scoring;
- retry/idempotency design before automatic reruns;
- audit trail for scoring runs;
- SMS/push delivery security if scoring alerts move beyond the current email
  foundation;
- stronger row-level validation before broad county adapter coverage expands.

## Drift Risks

Do not treat Phase 4 as final underwriting.

Do not duplicate scoring logic outside `packages/scoring`.

Do not add frontend score displays that invent fields not returned by the API.

Do not add automation, AI, or additional enrichment providers before the current
worker-scoring and enrichment boundaries remain stable under tests.
