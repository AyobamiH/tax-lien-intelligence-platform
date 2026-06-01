# Dataset Foundation Architecture

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
- manual field mapping only after the read-only readiness workflow proves where
  users need intervention;
- duplicate parcel handling after parcel identity exists;
- audit logging;
- antivirus/malware scanning if larger or persisted files are introduced.

## Drift Risks

Do not treat Phase 3, Phase 16, Phase 17, or Phase 18 as full ingestion
automation. The repo now stores dataset metadata, validation summary, import
summary, readiness summary, and internal source rows, and the browser can upload
one CSV at a time. One county-specific adapter exists; broad county-specific
normalization remains a future layer.

Do not add scoring into upload handlers.

Do not trust uploaded headers as normalized parcel fields.

Do not treat a user source label as county proof.

Do not turn readiness issues into client-side authorization or fake scoring
results. Readiness guides review; server-side scoring still owns score output.

Do not add background jobs before manual upload and validation are reliable.
