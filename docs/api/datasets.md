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
- County-specific import handling exposes only safe adapter summary metadata,
  not raw source rows or parser internals.
- Import readiness responses expose safe field coverage, issues, guidance, and
  scoring recommendation metadata only. They do not expose source rows or
  perform repair by themselves.
- Manual mapping responses expose dataset-specific target-to-source-column
  repair metadata only. They do not expose raw row values or mutate stored
  source rows.

## `POST /datasets`

Uploads and validates a manual CSV dataset.

The browser app now uses this same endpoint for authenticated dataset upload.
There is no separate client-only ingestion path.

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
    "importSummary": {
      "adapterMatched": false,
      "adapterId": "generic_csv",
      "adapterName": "Generic CSV normalization",
      "source": "generic_csv",
      "confidence": "low",
      "fallbackUsed": true,
      "mappedFields": [],
      "warnings": []
    },
    "readinessSummary": {
      "status": "partial",
      "score": 65,
      "scoringRecommended": true,
      "fieldCoverage": [
        {
          "field": "parcel_id",
          "label": "Parcel identifier",
          "presentRows": 2,
          "totalRows": 2,
          "coveragePercent": 100,
          "importance": "important"
        },
        {
          "field": "lien_amount",
          "label": "Lien amount",
          "presentRows": 2,
          "totalRows": 2,
          "coveragePercent": 100,
          "importance": "required"
        },
        {
          "field": "estimated_value",
          "label": "Estimated value",
          "presentRows": 2,
          "totalRows": 2,
          "coveragePercent": 100,
          "importance": "required"
        }
      ],
      "issues": [
        {
          "code": "generic_fallback_used",
          "severity": "info",
          "message": "No county-specific adapter matched; generic CSV mapping was used."
        }
      ],
      "guidance": ["Scoring is possible, but review warnings before trusting rankings."]
    },
    "manualMapping": {
      "mappings": []
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
      "importSummary": {
        "adapterMatched": true,
        "adapterId": "maricopa_tax_lien_v1",
        "adapterName": "Maricopa-style tax lien CSV",
        "source": "county_adapter",
        "confidence": "high",
        "fallbackUsed": false,
        "mappedFields": ["parcel_id", "lien_amount", "estimated_value", "property_type", "address"],
        "warnings": []
      },
      "readinessSummary": {
        "status": "ready",
        "score": 100,
        "scoringRecommended": true,
        "fieldCoverage": [],
        "issues": [],
        "guidance": ["Import quality is strong enough for scoring review."]
      },
      "manualMapping": {
        "mappings": []
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
    "importSummary": {
      "adapterMatched": false,
      "adapterId": "generic_csv",
      "adapterName": "Generic CSV normalization",
      "source": "generic_csv",
      "confidence": "low",
      "fallbackUsed": true,
      "mappedFields": [],
      "warnings": []
    },
    "readinessSummary": {
      "status": "partial",
      "score": 65,
      "scoringRecommended": true,
      "fieldCoverage": [],
      "issues": [],
      "guidance": ["Scoring is possible, but review warnings before trusting rankings."]
    },
    "manualMapping": {
      "mappings": []
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
- `manual_mapping_invalid_target`
- `manual_mapping_invalid_source_column`
- `manual_mapping_duplicate_source_column`

Auth errors use the Auth API error contract.

## Dataset Readiness Summary

Phase 18 adds a dataset-level readiness summary to upload, list, and detail
responses.

Readiness statuses:

- `ready`: recognized fields are strong enough for normal scoring review.
- `partial`: scoring can run, but the user should review warnings first.
- `weak`: enough data exists for limited interpretation, but scoring is not
  recommended without a cleaner import.
- `blocked`: required lien amount or estimated value data is not recognized.

Readiness is based on canonical field coverage for parcel identifier, lien
amount, estimated value, property type, and address context, plus import adapter
confidence and validation warnings. Parcel identifiers are important but not a
hard blocker; missing lien amount or estimated value is blocking.

This summary is advisory and safe for the browser. It does not expose stored
source rows, parser internals, or a manual field-mapping editor.

## `GET /datasets/:datasetId/mapping`

Returns the current mapping repair context for a dataset owned by the
authenticated user.

Cross-user access returns `dataset_not_found`.

### Response `200`

```json
{
  "dataset": {
    "id": "dataset-id",
    "originalFilename": "county.csv",
    "sourceType": "manual_csv",
    "status": "validated",
    "rowCount": 1,
    "columnCount": 3,
    "headers": ["Property Number", "Tax Balance", "County Value"],
    "validationSummary": {
      "totalRows": 1,
      "validRows": 1,
      "invalidRows": 0,
      "warnings": [],
      "errors": []
    },
    "importSummary": {
      "adapterMatched": false,
      "adapterId": "generic_csv",
      "adapterName": "Generic CSV normalization",
      "source": "generic_csv",
      "confidence": "low",
      "fallbackUsed": true,
      "mappedFields": [],
      "warnings": []
    },
    "readinessSummary": {
      "status": "blocked",
      "score": 15,
      "scoringRecommended": false,
      "fieldCoverage": [],
      "issues": [],
      "guidance": []
    },
    "manualMapping": {
      "mappings": []
    },
    "uploadedAt": "2026-05-25T00:00:00.000Z",
    "createdAt": "2026-05-25T00:00:00.000Z",
    "updatedAt": "2026-05-25T00:00:00.000Z"
  },
  "availableColumns": ["Property Number", "Tax Balance", "County Value"],
  "manualMapping": {
    "mappings": []
  }
}
```

## `PATCH /datasets/:datasetId/mapping`

Saves focused manual field mappings for a dataset, re-evaluates readiness, and
returns the updated safe mapping context.

Supported target fields:

- `parcel_id`
- `lien_amount`
- `estimated_value`
- `property_type`
- `address`

The source column must be one of the dataset headers. `null` clears a target
mapping. The same source column cannot map to multiple targets in one request.

### Request

```json
{
  "mappings": {
    "parcel_id": "Property Number",
    "lien_amount": "Tax Balance",
    "estimated_value": "County Value",
    "property_type": null,
    "address": null
  }
}
```

### Response `200`

```json
{
  "dataset": {
    "id": "dataset-id",
    "readinessSummary": {
      "status": "partial",
      "score": 65,
      "scoringRecommended": true,
      "fieldCoverage": [],
      "issues": [],
      "guidance": []
    },
    "manualMapping": {
      "updatedAt": "2026-06-01T00:00:00.000Z",
      "mappings": [
        {
          "targetField": "lien_amount",
          "sourceColumn": "Tax Balance",
          "source": "manual",
          "updatedAt": "2026-06-01T00:00:00.000Z"
        }
      ]
    }
  },
  "availableColumns": ["Property Number", "Tax Balance", "County Value"],
  "manualMapping": {
    "updatedAt": "2026-06-01T00:00:00.000Z",
    "mappings": [
      {
        "targetField": "lien_amount",
        "sourceColumn": "Tax Balance",
        "source": "manual",
        "updatedAt": "2026-06-01T00:00:00.000Z"
      }
    ]
  }
}
```

Manual mappings are applied as a derived overlay during readiness/scoring. They
do not rewrite stored source rows and they are not a full spreadsheet editor.

## Current Limitation

Dataset responses still expose only metadata and validation summaries. Phase 4
adds internal source row persistence for scoring, and Phase 5 adds a frontend
dataset review surface backed by this API. Phase 16 adds the first
county-specific import adapter boundary with a Maricopa-style CSV adapter and
generic fallback. Phase 17 adds browser upload using this endpoint. Phase 18
adds import validation/readiness summaries. Phase 19 adds focused manual mapping
repair for critical fields. Broad county coverage, live county sync, scraping,
row-by-row editing, full spreadsheet transforms, or ML/AI import classification
are not implemented. Phase 7 portfolio tracking is implemented separately from
dataset responses.
