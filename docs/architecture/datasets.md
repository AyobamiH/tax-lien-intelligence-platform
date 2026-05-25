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
- internal source row persistence for later scoring;
- dataset integration tests for ownership and upload failures.

Not implemented:

- full parcel/lien normalization;
- scoring inside the upload handler;
- browser dataset upload UI;
- watchlists;
- portfolio;
- county adapters;
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
- duplicate parcel handling after parcel identity exists;
- audit logging;
- antivirus/malware scanning if larger or persisted files are introduced.

## Drift Risks

Do not treat Phase 3 as full ingestion. It stores dataset metadata, validation
summary, and internal source rows. County-specific normalization remains a
future layer.

Do not add scoring into upload handlers.

Do not trust uploaded headers as normalized parcel fields.

Do not add background jobs before manual upload and validation are reliable.
