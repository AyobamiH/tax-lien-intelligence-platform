# Enrichment Adapter Foundation

## Scope

Phase 11 introduces the first enrichment layer between uploaded source rows and
scoring. The purpose is to improve data quality from the uploaded data already
available in the system, not to add external providers.

Implemented:

- enrichment adapter interface in `apps/api/src/enrichment`;
- enrichment service that applies adapters safely;
- first adapter: `source_field_inference`;
- persisted enrichment result embedded on scored records;
- enrichment-aware scoring pipeline: source row -> normalization -> enrichment
  -> scoring -> scored record;
- frontend record detail surface for enrichment signals and data quality;
- tests for adapter behavior, weak data, safe adapter failure, and scoring
  improvement through enrichment.

Not implemented:

- third-party geocoding;
- county live integrations;
- external valuation providers;
- ML/AI enrichment;
- enrichment scheduling;
- enrichment-specific UI or admin console.

## Boundary

The enrichment layer distinguishes:

- raw uploaded/source row fields stored on the dataset;
- normalized scoreable fields mapped by existing header normalization;
- enriched fields inferred from safe source-row aliases and components;
- scoring outputs generated after enrichment.

Adapters may derive fields from existing source data. They must not trust client
claims as authoritative, call external services, or mutate another tenant's
records.

## Current Adapter

`source_field_inference` improves common uploaded data inconsistencies:

- infers parcel identifiers from aliases such as `account_number`;
- infers lien amounts from aliases such as `tax_due`;
- infers property values from total assessed/market value fields or land plus
  improvement value components;
- infers property type from use/classification descriptions;
- builds address context from alternate or component address fields;
- computes a data-quality score for mapped core fields.

The adapter is conservative. It fills missing or unknown normalized fields; it
does not override clearly mapped source fields with lower-confidence guesses.

## Persistence

Scored records may now include an `enrichment` object with:

- adapters used;
- data quality score;
- inferred fields;
- enrichment signals;
- safe flags;
- safe reasoning.

This keeps enrichment inspectable without storing noisy raw diagnostics in the
browser response. Existing watchlist and portfolio snapshots continue to store
the score context they already owned; enrichment is currently surfaced on scored
record detail.

## Failure Handling

Adapter failures are fail-closed:

- scoring continues with available normalized fields;
- safe enrichment flags/reasoning are recorded;
- raw exceptions are not exposed to the user.

Future external adapters will need stronger isolation, timeout handling, retry
rules, provider-secret handling, and auditability before use.

## Security Notes

Enrichment is tenant-owned user-data processing.

Current protections:

- enrichment runs inside the worker scoring path after dataset ownership checks;
- enriched output is persisted only on the authenticated user's scored records;
- cross-user score access remains blocked by existing dataset/score ownership;
- adapter failures produce safe metadata only;
- no external secrets or network calls are introduced.

## Drift Controls

Do not:

- add external enrichment providers in this layer without a separate phase;
- let adapters overwrite trusted source mappings without clear rules;
- store raw stack traces or full source rows in enrichment output;
- expose enrichment as final truth;
- describe enrichment as ML/AI or county-specific intelligence.

## Update Rules

Update this document when:

- adapters are added or removed;
- enrichment output shape changes;
- enrichment begins using external providers;
- enrichment scheduling is added;
- frontend enrichment visibility changes.
