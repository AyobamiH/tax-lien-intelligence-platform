import type {
  DatasetManualMappingEntry,
  DatasetManualMappingSummary,
  DatasetManualMappingTarget,
} from "@tax-lien/types";
import type { StoredDatasetSourceRow } from "./dataset-store.js";

export const manualMappingTargets: DatasetManualMappingTarget[] = [
  "parcel_id",
  "lien_amount",
  "estimated_value",
  "property_type",
  "address",
];

const manualMappingTargetSet = new Set<DatasetManualMappingTarget>(manualMappingTargets);

export type ManualMappingValues = Partial<Record<DatasetManualMappingTarget, string | null>>;

export function isManualMappingTarget(value: string): value is DatasetManualMappingTarget {
  return manualMappingTargetSet.has(value as DatasetManualMappingTarget);
}

export function emptyManualMappingSummary(): DatasetManualMappingSummary {
  return {
    mappings: [],
  };
}

export function buildManualMappingSummary(
  mappingValues: ManualMappingValues,
  timestamp: Date,
): DatasetManualMappingSummary {
  const updatedAt = timestamp.toISOString();
  const mappings = manualMappingTargets.flatMap<DatasetManualMappingEntry>((targetField) => {
    const sourceColumn = mappingValues[targetField]?.trim();
    if (!sourceColumn) {
      return [];
    }

    return [
      {
        targetField,
        sourceColumn,
        source: "manual",
        updatedAt,
      },
    ];
  });

  return {
    mappings,
    updatedAt,
  };
}

export function applyManualMappingsToRows(
  sourceRows: StoredDatasetSourceRow[],
  manualMapping: DatasetManualMappingSummary | undefined,
): StoredDatasetSourceRow[] {
  if (!manualMapping || manualMapping.mappings.length === 0) {
    return sourceRows;
  }

  return sourceRows.map((sourceRow) => {
    const fields = { ...sourceRow.fields };

    for (const mapping of manualMapping.mappings) {
      const value = sourceRow.fields[mapping.sourceColumn]?.trim();
      if (value) {
        fields[mapping.targetField] = value;
      }
    }

    return {
      rowNumber: sourceRow.rowNumber,
      fields,
    };
  });
}

export function manualMappingValuesFromSummary(
  manualMapping: DatasetManualMappingSummary | undefined,
): ManualMappingValues {
  const values: ManualMappingValues = {};

  for (const mapping of manualMapping?.mappings ?? []) {
    values[mapping.targetField] = mapping.sourceColumn;
  }

  return values;
}
