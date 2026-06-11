# Dataset Foundation Architecture

Phase 29 places dataset routes behind selected-workspace membership and role
checks. Existing dataset `userId` values remain the workspace owner
compatibility tenant key; members can read and owners/admins can mutate.

## Scope

Phase 3 adds the first tenant-owned dataset layer. It is manual-first and
security-focused.

Implemented:

- authenticated `POST /datasets`;
- authenticated `GET /datasets`;
- authenticated `GET /datasets/:datasetId`;
- dataset model;
- dataset ownership by authenticated `userId`;
- CSV upload handling with `multer`;
- safe CSV parsing and validation;
- dataset validation summary;
- county import adapter boundary;
- first Maricopa-style tax lien CSV adapter;
- safe import summary metadata;
- browser upload UI integrated with the authenticated app;
- upload success/error/submitting states in the frontend;
- internal source row persistence for later scoring;
- dataset readiness summary with canonical field coverage, issues, scoring
  recommendation, and user-facing guidance;
- dataset-specific manual mapping summary for focused import repair;
- authenticated manual mapping context/save endpoints;
- tenant-owned reusable import profile model and matching logic;
- authenticated import profile list/save/apply endpoints;
- deterministic profile reuse during future uploads;
- dataset integration tests for ownership and upload failures.

Not implemented:

- full parcel/lien normalization;
- scoring inside the upload handler;
- broad county adapter coverage;
- live county sync;
- background ingestion automation.

## Dataset Model

The dataset model lives in `packages/db`.

Stored concepts:

- `userId`;
- `originalFilename`;
- `sourceType`;
- optional `sourceLabel`;
- `status`;
- `rowCount`;
- `columnCount`;
- `headers`;
- internal sanitized `sourceRows`;
- `validationSummary`;
- `importSummary`;
- `readinessSummary`;
- `manualMapping`;
- `importProfile`;
- `uploadedAt`;
- timestamps.

Current status value:

- `validated`

The status is intentionally small. Future processing states should be added only
when the product has background work or a richer ingestion lifecycle.

## Ownership Boundary

Every dataset record belongs to a user.

The API derives ownership from `request.auth.userId`, which is attached by the
auth middleware after JWT verification. The client cannot choose dataset owner.

List and detail queries are scoped by user id. Cross-user detail access returns
`dataset_not_found`.

## CSV Upload Boundary

Uploads use `multer` memory storage because Phase 3 handles small manual CSV
files and does not persist raw files.

The upload boundary enforces:

- one file;
- 1 MiB maximum size;
- CSV-like filename or content type;
- non-empty content;
- parseable CSV structure;
- header row;
- no duplicate headers;
- row limit;
- column limit;
- record-size limit.

The API does not trust file metadata alone. It also parses and validates the CSV
content before creating a dataset record.

Phase 17 exposes this API from the browser app. The frontend upload form does
not create a parallel ingestion path; it posts multipart form data to
`POST /datasets` with one file and an optional source label, then shows the
returned validation/import summary and opens the dataset review route.

## CSV Parsing Boundary

The parser validates file shape and summary information. It also stores
sanitized source row field maps internally for scoring. Public dataset responses
do not expose those rows.

Validation summary includes:

- total rows;
- valid rows;
- invalid blank rows;
- warnings;
- errors.

The public API uses `errors`; the Mongo record stores those internally as
`errorMessages` to avoid Mongoose reserved field warnings.

## County Import Adapter Boundary

Phase 16 adds an adapter layer after CSV parsing and before dataset persistence.
The first adapter is `maricopa_tax_lien_v1`, a Maricopa-style tax lien CSV
mapper.

The adapter can add canonical internal fields such as `parcel_id`,
`lien_amount`, `estimated_value`, `property_type`, and `address` to source rows
when APN-style evidence and supporting county headers are present. This improves
downstream normalization and scoring without exposing raw rows in dataset
responses.

If the adapter does not match, the upload stays on the generic CSV path. Generic
fallback is explicit in `importSummary` and preserves existing behavior.

Partial county-style files may match with lower confidence and import warnings.
Those warnings are summary metadata; scoring still applies its conservative
missing-data flags.

## Import Readiness Boundary

Phase 18 adds an import validation/readiness layer after CSV parsing and county
adapter handling.

The readiness summary answers whether a dataset is usable for scoring review
before the user spends time on results. It computes:

- canonical field coverage for parcel identifier, lien amount, estimated value,
  property type, and address context;
- dataset-level readiness status: `ready`, `partial`, `weak`, or `blocked`;
- a 0-100 readiness score;
- whether scoring is recommended;
- safe issue summaries;
- user-facing guidance.

Lien amount and estimated value are required for readiness. Parcel identifiers,
property type, and address context are important quality signals, but missing
parcel identifiers are warnings rather than hard blockers.

Readiness does not create a manual field-mapping editor. It also does not imply
the current adapter catalog covers broad county formats. It is a visibility and
trust layer over the import result.

## Manual Mapping Repair Boundary

Phase 19 adds a focused import repair workflow for critical scoring fields.

The backend stores dataset-specific manual mappings that connect known source
columns to canonical internal targets:

- `parcel_id`;
- `lien_amount`;
- `estimated_value`;
- `property_type`;
- `address`.

Mappings are tenant-owned through the dataset. The API validates that target
fields are supported, that source columns exist in the dataset headers, and that
one source column is not mapped to multiple target fields in a single request.

Manual mappings are applied as a derived overlay when readiness and scoring run.
Stored source rows are not rewritten. This preserves source truth while allowing
the user to repair weak or blocked imports.

Manual mapping is not a full spreadsheet editor, arbitrary row mutation,
ML/AI field suggestion system, or broad county adapter substitute.

## Import Profile Reuse Boundary

Phase 20 adds reusable import profiles for repeated manual import workflows.

An import profile stores tenant-owned mapping rules derived from a dataset's
validated manual mapping. A profile records:

- `userId`;
- profile name;
- optional source label;
- adapter id/name context;
- supported target-to-source-column mapping rules;
- normalized header signature and source-column applicability metadata;
- created-from dataset id;
- timestamps.

Profiles are private to the creating user. They are not global, shared,
marketplace, or cross-tenant mapping knowledge.

Profile matching is deterministic and conservative:

- if a future upload contains the saved header signature and every mapped
  source column is present unambiguously, the profile can be auto-applied;
- if every mapped source column is present but the broader header shape has
  changed, the profile is suggested and requires user confirmation;
- if mapped source columns are missing or ambiguous after normalized header
  comparison, no profile is applied or suggested.

Profile application uses the same derived mapping overlay as manual mapping.
Stored source rows are not rewritten. Reuse changes readiness/scoring inputs by
making canonical field values available through the overlay, and dataset
responses expose whether a profile was not used, suggested, auto-applied, or
user-applied.

This is not a full ETL rule builder, ML classifier, global profile catalog,
live sync mechanism, or spreadsheet transform engine.

## Dependency Decision

`multer` is used as the minimal multipart upload middleware for Express.

Reason:

- Express does not parse multipart form data by itself;
- the product needs a real file upload endpoint;
- `multer` is stable and narrowly scoped;
- parsing and domain validation remain in app code.

## Security Notes

Phase 3 improves security posture by introducing the first real tenant-owned
resource and testing ownership boundaries.

Phase 4 uses the internal source rows for scoring while keeping dataset metadata
responses compact and safe.

Remaining hardening:

- rate limiting;
- raw file persistence strategy if needed later;
- richer normalized row validation;
- additional county adapters only after deterministic mapping tests;
- richer import tooling only after the focused manual mapping repair workflow
  proves where users need more control;
- profile management beyond private deterministic mapping reuse;
- duplicate parcel handling after parcel identity exists;
- audit logging;
- antivirus/malware scanning if larger or persisted files are introduced.

## Drift Risks

Do not treat Phase 3, Phase 16, Phase 17, Phase 18, Phase 19, or Phase 20 as full
ingestion automation. The repo now stores dataset metadata, validation summary,
import summary, readiness summary, manual mapping summary, import profile
application metadata, and internal source rows, and the browser can upload one
CSV at a time. One county-specific adapter exists; broad county-specific
normalization remains a future layer.

Do not add scoring into upload handlers.

Do not trust uploaded headers as normalized parcel fields.

Do not treat a user source label as county proof.

Do not turn readiness issues into client-side authorization or fake scoring
results. Readiness guides review; server-side scoring still owns score output.

Do not turn manual mapping into row-by-row data editing. It is target-to-column
repair metadata only.

Do not turn import profiles into hidden automation. Reuse must remain visible,
tenant-owned, deterministic, and reversible through explicit mapping changes.

Do not add background jobs before manual upload and validation are reliable.
