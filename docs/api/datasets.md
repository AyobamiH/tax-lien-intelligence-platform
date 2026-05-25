# Dataset API

Phase 3 adds the manual-first dataset foundation. Dataset routes are
authenticated and tenant-scoped.

## Security Model

- All dataset routes require `Authorization: Bearer <jwt-access-token>`.
- Dataset ownership is derived from the authenticated token.
- The API does not trust a client-supplied `userId`.
- Uploads are limited to 1 MiB.
- Uploads are parsed from memory with controlled row, column, and record-size
  limits.
- Malformed or empty CSVs are rejected safely.
- Public dataset responses contain metadata and validation summary only. The
  server stores sanitized source rows internally so scoring can derive records
  without exposing raw row content in dataset metadata responses.

## `POST /datasets`

Uploads and validates a manual CSV dataset.

### Request

Content type:

`multipart/form-data`

Fields:

- `file`: required CSV file.
- `sourceLabel`: optional human label for the source, max 120 characters.

Example:

```text
file=@county.csv
sourceLabel=County May file
```

### Response `201`

```json
{
  "dataset": {
    "id": "dataset-id",
    "originalFilename": "county.csv",
    "sourceType": "manual_csv",
    "sourceLabel": "County May file",
    "status": "validated",
    "rowCount": 2,
    "columnCount": 3,
    "headers": ["parcel_id", "lien_amount", "estimated_value"],
    "validationSummary": {
      "totalRows": 2,
      "validRows": 2,
      "invalidRows": 0,
      "warnings": [],
      "errors": []
    },
    "uploadedAt": "2026-05-25T00:00:00.000Z",
    "createdAt": "2026-05-25T00:00:00.000Z",
    "updatedAt": "2026-05-25T00:00:00.000Z"
  }
}
```

## `GET /datasets`

Lists datasets owned by the authenticated user.

### Response `200`

```json
{
  "datasets": [
    {
      "id": "dataset-id",
      "originalFilename": "county.csv",
      "sourceType": "manual_csv",
      "status": "validated",
      "rowCount": 2,
      "columnCount": 3,
      "headers": ["parcel_id", "lien_amount", "estimated_value"],
      "validationSummary": {
        "totalRows": 2,
        "validRows": 2,
        "invalidRows": 0,
        "warnings": [],
        "errors": []
      },
      "uploadedAt": "2026-05-25T00:00:00.000Z",
      "createdAt": "2026-05-25T00:00:00.000Z",
      "updatedAt": "2026-05-25T00:00:00.000Z"
    }
  ]
}
```

## `GET /datasets/:datasetId`

Returns one dataset owned by the authenticated user.

Cross-user access returns `dataset_not_found` rather than revealing that another
user's dataset exists.

### Response `200`

```json
{
  "dataset": {
    "id": "dataset-id",
    "originalFilename": "county.csv",
    "sourceType": "manual_csv",
    "status": "validated",
    "rowCount": 2,
    "columnCount": 3,
    "headers": ["parcel_id", "lien_amount", "estimated_value"],
    "validationSummary": {
      "totalRows": 2,
      "validRows": 2,
      "invalidRows": 0,
      "warnings": [],
      "errors": []
    },
    "uploadedAt": "2026-05-25T00:00:00.000Z",
    "createdAt": "2026-05-25T00:00:00.000Z",
    "updatedAt": "2026-05-25T00:00:00.000Z"
  }
}
```

## Dataset Error Codes

Possible dataset errors:

- `dataset_file_required`
- `dataset_invalid_file_type`
- `dataset_empty_csv`
- `dataset_no_data_rows`
- `dataset_no_valid_rows`
- `dataset_missing_headers`
- `dataset_duplicate_headers`
- `dataset_too_many_columns`
- `dataset_too_many_rows`
- `dataset_upload_too_large`
- `dataset_malformed_csv`
- `dataset_invalid_source_label`
- `dataset_invalid_id`
- `dataset_not_found`
- `dataset_upload_failed`

Auth errors use the Auth API error contract.

## Current Limitation

Dataset responses still expose only metadata and validation summaries. Phase 4
adds internal source row persistence for scoring, and Phase 5 adds a frontend
dataset review surface backed by this API. There is not yet a browser CSV upload
screen, watchlist, portfolio workflow, or county-specific normalization adapter.
