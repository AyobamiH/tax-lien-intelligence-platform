# Enrichment Architecture

## Scope

Phase 11 introduced the first enrichment layer between uploaded source rows and
scoring. Phase 12 proved that boundary with one controlled external provider:
the U.S. Census Geocoder. Phase 13 makes enrichment an explicit orchestration
subsystem with adapter outcomes, deliberate fallback records, freshness
metadata, and reprocessing readiness. Phase 14 adds the first controlled
user-triggered refresh path on top of that readiness. Phase 15 adds scheduled
maintenance groundwork that can inspect freshness metadata and queue
policy-gated refresh jobs when explicitly enabled.

Implemented:

- enrichment adapter interface in `apps/api/src/enrichment`;
- enrichment orchestration layer that applies internal and external adapters in
  explicit order;
- internal adapter: `source_field_inference`;
- external adapter: `census_geocoder`;
- opt-in Census Geocoder configuration through environment variables;
- timeout and per-job row limits for external geocoding;
- adapter outcome records for success, skipped, partial, and failed enrichment;
- freshness metadata with `enrichedAt`, `staleAt`, `reprocessAfter`, source
  version, and reprocess eligibility;
- authenticated refresh/reprocessing requests that enqueue or reuse
  dataset-scoring jobs;
- scheduled maintenance scanning of stale scored-record freshness metadata;
- policy-gated `policy_refresh` jobs that are distinguishable from manual
  refresh jobs;
- persisted enrichment result embedded on scored records;
- enrichment-aware scoring pipeline: source row -> normalization -> enrichment
  -> scoring -> scored record;
- frontend record detail surface for enrichment signals, data quality, and safe
  external location context;
- tests for adapter behavior, weak data, safe adapter failure, external success,
  timeout/failure, row-limit skipping, and worker scoring persistence.

Not implemented:

- multiple external providers;
- paid geocoding or valuation services;
- county live integrations;
- ML/AI enrichment;
- enrichment scheduling;
- unlimited automatic recurring refresh;
- unlimited autonomous refresh or broad sync;
- enrichment-specific management UI or admin console.

## Boundary

The enrichment layer distinguishes:

- raw uploaded/source row fields stored on the dataset;
- normalized scoreable fields mapped by existing header normalization;
- enriched fields inferred from safe source-row aliases and components;
- safe external enrichment result metadata;
- scoring outputs generated after enrichment.

Adapters may derive fields from existing source data or from explicitly
configured external providers. They must not trust client claims as
authoritative, mutate another tenant's records, expose raw provider payloads, or
turn external context into hidden final investment truth.

## Current Adapters

### `source_field_inference`

This internal adapter improves common uploaded data inconsistencies:

- infers parcel identifiers from aliases such as `account_number`;
- infers lien amounts from aliases such as `tax_due`;
- infers property values from total assessed/market value fields or land plus
  improvement value components;
- infers property type from use/classification descriptions;
- builds address context from alternate or component address fields;
- computes a data-quality score for mapped core fields.

It is conservative. It fills missing or unknown normalized fields; it does not
override clearly mapped source fields with lower-confidence guesses.

### `census_geocoder`

This external adapter uses the U.S. Census Geocoder for address normalization
and location context. It is disabled by default and enabled explicitly through:

```text
CENSUS_GEOCODER_ENABLED=true
CENSUS_GEOCODER_BASE_URL=https://geocoding.geo.census.gov
CENSUS_GEOCODER_BENCHMARK=Public_AR_Current
CENSUS_GEOCODER_TIMEOUT_MS=3000
CENSUS_GEOCODER_MAX_ROWS_PER_JOB=25
ENRICHMENT_FRESHNESS_WINDOW_DAYS=30
```

The adapter:

- uses the normalized address produced by earlier normalization/enrichment;
- calls only the configured Census Geocoder endpoint;
- applies a bounded timeout;
- skips rows beyond the configured per-job row limit;
- records matched address, latitude, longitude, benchmark, confidence, status,
  and timestamp when a match exists;
- records safe `no_match`, `timeout`, `failed`, or `skipped` status metadata
  without exposing raw provider errors.

The current external result improves review visibility and creates a safe
foundation for future location-aware scoring. It does not claim that a geocode
match proves property quality, title status, access, buildability, or investment
suitability.

## Orchestration And Fallback

The enrichment service now wraps adapters in an orchestration layer. The
pipeline order is explicit:

1. internal source-field inference;
2. external Census geocoder when configured, or a deliberate skipped fallback
   outcome when disabled.

Every adapter produces an adapter outcome with:

- adapter id;
- stage: `internal` or `external`;
- status: `success`, `skipped`, `partial`, or `failed`;
- safe message;
- started/completed timestamps.

External provider weakness is not fatal. `no_match` is recorded as partial,
timeout/failure is recorded as failed-safe, disabled configuration is recorded
as skipped, and scoring continues with available normalized/enriched fields.

## Freshness And Reprocessing Readiness

Every enrichment result stores freshness metadata:

- overall `enrichedAt`;
- source/version tag;
- `staleAt`;
- `reprocessAfter`;
- `reprocessEligible`.

New results are fresh. The stored `reprocessAfter` timestamp gives future
schedulers or workers a clear, tenant-safe way to decide which scored records
should be re-enriched when provider config changes or external context ages.

Dataset scoring is already a worker-backed rerun path. Phase 14 adds
`POST /datasets/:datasetId/refresh`, a deliberate refresh request that enqueues
a `dataset_scoring` job with `requestKind: "refresh"` or returns the already
queued/running dataset job when one exists. The worker re-runs normalization,
orchestration, enrichment, scoring, and persistence for the owned dataset. Job
summaries include enrichment counts and earliest reprocess timing.

Phase 15 uses `reprocessAfter` and `reprocessEligible` to find stale scored
datasets through the worker scheduler. Scheduled maintenance queues
`dataset_maintenance` jobs first; those jobs verify ownership and policy gates
before creating any `policy_refresh` scoring job. The default server policy is
manual-only.

Refresh replaces the current scored-record set for the dataset by source row.
Watchlist and portfolio records keep their denormalized decision snapshots; the
refreshed scored records are the current dataset-review truth.

## Persistence

Scored records may now include an `enrichment` object with:

- adapters used;
- orchestration version;
- adapter outcomes;
- freshness metadata;
- data quality score;
- inferred fields;
- safe external enrichment results;
- enrichment signals;
- safe flags;
- safe reasoning.

External results persist only normalized, user-visible metadata. Raw Census
responses, stack traces, request internals, and full source rows are not stored
in scored-record enrichment output.

## Failure Handling

Adapter failures are fail-closed:

- scoring continues with available normalized fields;
- safe enrichment flags/reasoning are recorded;
- adapter outcome status records the failure or skip;
- external provider timeout/failure/no-match states are represented as low
  confidence metadata;
- raw exceptions and raw provider payloads are not exposed to the user.

The scoring job remains a worker-claimed `dataset_scoring` job. External
enrichment runs inside that worker scoring path after dataset ownership checks.

## Security Notes

Enrichment is tenant-owned user-data processing.

Current protections:

- enrichment runs inside the worker scoring path after dataset ownership checks;
- enriched output is persisted only on the authenticated user's scored records;
- cross-user score access remains blocked by existing dataset/score ownership;
- the external adapter is opt-in and uses HTTPS-only provider config;
- external geocoding has timeout and per-job row limits;
- enrichment has bounded freshness metadata for later reprocessing rather than
  unbounded rerun loops;
- refresh requests are authenticated, tenant-scoped, and duplicate-safe while a
  dataset job is queued or running;
- adapter failures produce safe metadata only;
- no API keys or external provider secrets are required for the current Census
  provider.

Future providers that require credentials must use environment/config only,
avoid browser exposure, add provider-specific timeout/rate controls, and define
what metadata is safe to persist before integration.

## Drift Controls

Do not:

- add provider sprawl in this layer without a separate phase;
- let adapters overwrite trusted source mappings without clear rules;
- store raw provider payloads, raw stack traces, or full source rows in
  enrichment output;
- expose enrichment as final truth;
- describe enrichment as ML/AI or county-specific intelligence;
- enable unbounded external calls during scoring.

## Update Rules

Update this document when:

- adapters are added or removed;
- enrichment output shape changes;
- external enrichment config changes;
- enrichment begins using provider credentials;
- enrichment scheduling is added;
- frontend enrichment visibility changes.
