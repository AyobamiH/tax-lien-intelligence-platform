import { describe, expect, it } from "vitest";
import {
  applyManualMappingsToRows,
  buildManualMappingSummary,
  emptyManualMappingSummary,
  manualMappingValuesFromSummary,
} from "../../apps/api/src/datasets/manual-mapping.js";
import type { StoredDatasetSourceRow } from "../../apps/api/src/datasets/dataset-store.js";

function sourceRow(fields: Record<string, string>): StoredDatasetSourceRow {
  return {
    rowNumber: 2,
    fields,
  };
}

describe("manual mapping helpers", () => {
  it("applies manual mappings as a derived overlay without mutating stored source rows", () => {
    const rows = [sourceRow({ "Tax Balance": "1000", "County Value": "12000" })];
    const manualMapping = buildManualMappingSummary(
      {
        lien_amount: "Tax Balance",
        estimated_value: "County Value",
      },
      new Date("2026-06-01T00:00:00.000Z"),
    );

    const mappedRows = applyManualMappingsToRows(rows, manualMapping);

    expect(mappedRows[0]?.fields).toMatchObject({
      "Tax Balance": "1000",
      "County Value": "12000",
      lien_amount: "1000",
      estimated_value: "12000",
    });
    expect(rows[0]?.fields).toEqual({
      "Tax Balance": "1000",
      "County Value": "12000",
    });
  });

  it("round-trips manual mapping values for editing surfaces", () => {
    const emptySummary = emptyManualMappingSummary();
    const manualMapping = buildManualMappingSummary(
      {
        parcel_id: "Property Number",
        lien_amount: null,
        estimated_value: "Assessment",
      },
      new Date("2026-06-01T00:00:00.000Z"),
    );

    expect(emptySummary).toEqual({ mappings: [] });
    expect(manualMapping.mappings).toEqual([
      {
        targetField: "parcel_id",
        sourceColumn: "Property Number",
        source: "manual",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        targetField: "estimated_value",
        sourceColumn: "Assessment",
        source: "manual",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ]);
    expect(manualMappingValuesFromSummary(manualMapping)).toEqual({
      parcel_id: "Property Number",
      estimated_value: "Assessment",
    });
  });
});
