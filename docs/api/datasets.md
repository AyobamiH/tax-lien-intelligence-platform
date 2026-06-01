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
- Import profile responses expose tenant-owned reusable mapping rules and safe
  applicability metadata only. Profiles are never shared across users, and
  profile reuse is deterministic header matching, not ML-based classification.

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
    "importProfile": {
      "status": "none",
      "matchedMappings": 0,
      "totalMappings": 0,
      "message": "No reusable import profile was applied."
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
      "importProfile": {
        "status": "none",
        "matchedMappings": 0,
        "totalMappings": 0,
        "message": "No reusable import profile was applied."
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
    "importProfile": {
      "status": "none",
      "matchedMappings": 0,
      "totalMappings": 0,
      "message": "No reusable import profile was applied."
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
- `import_profile_invalid_id`
- `import_profile_not_found`
- `import_profile_no_mapping`
- `import_profile_not_ready`
- `import_profile_invalid_mapping`
- `import_profile_invalid_name`
- `import_profile_not_applicable`

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
    "importProfile": {
      "status": "none",
      "matchedMappings": 0,
      "totalMappings": 0,
      "message": "No reusable import profile was applied."
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
    },
    "importProfile": {
      "status": "none",
      "matchedMappings": 0,
      "totalMappings": 0,
      "message": "No reusable import profile was applied."
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

## `GET /datasets/import-profiles`

Lists reusable import profiles owned by the authenticated user.

Profiles are private tenant configuration. They contain mapping rules and
header-shape applicability metadata, not raw uploaded row values.

### Response `200`

```json
{
  "profiles": [
    {
      "id": "profile-id",
      "name": "County repeat import",
      "sourceLabel": "County repeat sale",
      "adapterId": "generic_csv",
      "adapterName": "Generic CSV normalization",
      "mappings": [
        {
          "targetField": "lien_amount",
          "sourceColumn": "Tax Balance"
        },
        {
          "targetField": "estimated_value",
          "sourceColumn": "County Value"
        }
      ],
      "applicability": {
        "headerSignature": ["county value", "property number", "tax balance"],
        "sourceColumns": ["county value", "tax balance"],
        "adapterId": "generic_csv",
        "columnCount": 3
      },
      "createdFromDatasetId": "dataset-id",
      "createdAt": "2026-06-01T00:00:00.000Z",
      "updatedAt": "2026-06-01T00:00:00.000Z"
    }
  ]
}
```

## `POST /datasets/:datasetId/import-profile`

Saves the current dataset mapping as a reusable import profile.

The dataset must belong to the authenticated user, must have saved mappings,
and the saved mappings must make the dataset scoring-ready. This prevents a
weak or blocked repair from becoming reusable configuration.

### Request

```json
{
  "name": "County repeat import"
}
```

`name` is optional. If omitted, the server derives a profile name from the
dataset source label or filename.

### Response `201`

```json
{
  "profile": {
    "id": "profile-id",
    "name": "County repeat import",
    "adapterId": "generic_csv",
    "adapterName": "Generic CSV normalization",
    "mappings": [
      {
        "targetField": "lien_amount",
        "sourceColumn": "Tax Balance"
      }
    ],
    "applicability": {
      "headerSignature": ["county value", "tax balance"],
      "sourceColumns": ["tax balance"],
      "adapterId": "generic_csv",
      "columnCount": 2
    },
    "createdFromDatasetId": "dataset-id",
    "createdAt": "2026-06-01T00:00:00.000Z",
    "updatedAt": "2026-06-01T00:00:00.000Z"
  }
}
```

## `POST /datasets/:datasetId/import-profile/apply`

Applies a reusable import profile to an owned dataset after user confirmation.

The profile must belong to the authenticated user and all profile source
columns must be present unambiguously in the dataset headers. Applying a profile
updates the dataset mapping overlay, re-evaluates readiness, and returns the
updated dataset response.

### Request

```json
{
  "profileId": "profile-id"
}
```

### Response `200`

```json
{
  "dataset": {
    "id": "dataset-id",
    "manualMapping": {
      "updatedAt": "2026-06-01T00:00:00.000Z",
      "mappings": [
        {
          "targetField": "lien_amount",
          "sourceColumn": "Tax Balance",
          "source": "import_profile",
          "updatedAt": "2026-06-01T00:00:00.000Z"
        }
      ]
    },
    "importProfile": {
      "status": "user_applied",
      "profileId": "profile-id",
      "profileName": "County repeat import",
      "confidence": "medium",
      "matchedMappings": 1,
      "totalMappings": 1,
      "message": "Import profile \"County repeat import\" was applied by user confirmation using 1/1 mapped column(s).",
      "appliedAt": "2026-06-01T00:00:00.000Z"
    }
  },
  "appliedProfile": {
    "id": "profile-id",
    "name": "County repeat import"
  }
}
```

## Import Profile Reuse on Upload

When a user uploads a future dataset, the server compares the new headers with
that user's saved import profiles.

Reuse behavior is deterministic:

- if all saved profile headers are present and mapped source columns match
  unambiguously, the profile is auto-applied with `status: "auto_applied"`;
- if all mapped source columns match but the broader header shape changed, the
  profile is returned as `status: "suggested"` and the user can confirm it;
- if required mapped source columns are missing or ambiguous, no profile is
  applied or suggested.

Profile reuse applies a derived mapping overlay. It does not rewrite stored
source rows, does not use ML, and does not share profiles across tenants.

## Current Limitation

Dataset responses still expose only metadata and validation summaries. Phase 4
adds internal source row persistence for scoring, and Phase 5 adds a frontend
dataset review surface backed by this API. Phase 16 adds the first
county-specific import adapter boundary with a Maricopa-style CSV adapter and
generic fallback. Phase 17 adds browser upload using this endpoint. Phase 18
adds import validation/readiness summaries. Phase 19 adds focused manual mapping
repair for critical fields. Phase 20 adds tenant-owned reusable import profiles
and deterministic mapping reuse. Broad county coverage, live county sync,
scraping, row-by-row editing, full spreadsheet transforms, global/shared
profiles, or ML/AI import classification are not implemented. Phase 7 portfolio
tracking is implemented separately from dataset responses.
