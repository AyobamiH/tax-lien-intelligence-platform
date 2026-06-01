# County Import Adapter Foundation

## Scope

Phase 16 introduces the first county-specific import adapter boundary. It proves
that uploaded CSV rows can be interpreted through an explicit county-aware
mapping layer before scoring, while preserving the generic CSV path.

This is not broad county coverage, live county sync, scraping, provider sprawl,
ML/AI classification, collaboration, or auction execution.

## Current Implementation

Implemented:

- county import adapter interface in `apps/api/src/datasets/import-adapters.ts`;
- Maricopa-style tax lien CSV adapter;
- generic CSV fallback summary;
- safe import summary on dataset responses;
- canonical internal field mapping for matched county rows;
- frontend dataset detail/list visibility for adapter/fallback context;
- tests for adapter match, generic fallback, partial county files, non-match
  safety, API import summaries, and downstream scoring readiness.

Current adapter:

- `maricopa_tax_lien_v1`
- display name: `Maricopa-style tax lien CSV`

## Import Flow

The dataset flow is now:

1. upload CSV through `POST /datasets`;
2. validate file metadata, size, headers, and rows;
3. build sanitized source rows;
4. run county adapter detection against headers;
5. if one adapter matches, add canonical internal fields to source rows;
6. otherwise preserve generic source rows;
7. store dataset metadata, internal source rows, validation summary, and import
   summary;
8. scoring later normalizes/enriches stored source rows through the existing job
   path.

The adapter does not create a second ingestion route. It is a preprocessing
boundary inside the existing dataset upload service.

## Maricopa-Style Adapter

The first adapter recognizes APN-style exports with supporting tax/value/use or
situs fields. It maps known headers such as:

- `APN` or assessor parcel identifiers to `parcel_id`;
- `Total Due`, `Tax Due`, or similar amount fields to `lien_amount`;
- `Full Cash Value`, `FCV`, `Limited Property Value`, or similar fields to
  `estimated_value`;
- `Property Use Description`, `Use Code`, or `Legal Class` to `property_type`;
- situs street/city/state/zip fields to `address`.

The adapter requires APN-style parcel evidence before matching. Generic files
with ordinary `parcel_id` headers should stay on the generic path.

## Import Summary

Dataset responses include `importSummary`:

- whether a county adapter matched;
- adapter id/name;
- source type: `generic_csv` or `county_adapter`;
- confidence;
- whether fallback was used;
- mapped canonical fields;
- safe warnings.

This summary is user-visible trust metadata. It must stay compact and safe. It
must not expose raw source rows, parser internals, stack traces, or another
tenant's data.

## Fallback Behavior

If no adapter matches, upload still succeeds through generic handling. Generic
handling preserves existing behavior and returns:

- `adapterMatched: false`;
- `adapterId: "generic_csv"`;
- `fallbackUsed: true`.

Partial Maricopa-style files may still match with low confidence. Missing core
field mappings are reported as import warnings, and downstream scoring keeps its
existing conservative missing-data flags.

## Security Notes

County import handling is part of the upload trust boundary.

Rules:

- adapter detection must use explicit header evidence;
- client-provided county labels must not be trusted as proof;
- source rows remain internal;
- adapter summaries must be safe for browser display;
- generic fallback must remain available;
- scoring and ownership checks remain unchanged;
- county-specific logic must not bypass tenant ownership.

## Drift Controls

Do not:

- add multiple county adapters without tests and docs;
- infer county identity from user copy alone;
- expose raw source rows in import summaries;
- move scoring into upload handlers;
- create live county sync as part of this adapter boundary;
- use ML/AI classification before deterministic adapter rules are reliable.

## Update Rules

Update this document when:

- a county adapter is added or changed;
- import summary shape changes;
- canonical mapping changes;
- county import behavior affects scoring or enrichment;
- live/scheduled county ingestion becomes real.
