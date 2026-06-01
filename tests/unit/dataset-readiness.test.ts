import { describe, expect, it } from "vitest";
import type { DatasetImportSummary, DatasetValidationSummary } from "@tax-lien/types";
import { calculateDatasetReadiness } from "../../apps/api/src/datasets/readiness.js";
import type { StoredDatasetSourceRow } from "../../apps/api/src/datasets/dataset-store.js";

function sourceRow(rowNumber: number, fields: Record<string, string>): StoredDatasetSourceRow {
  return { rowNumber, fields };
}

function validationSummary(overrides: Partial<DatasetValidationSummary> = {}): DatasetValidationSummary {
  return {
    totalRows: 1,
    validRows: 1,
    invalidRows: 0,
    warnings: [],
    errors: [],
    ...overrides,
  };
}

function importSummary(overrides: Partial<DatasetImportSummary> = {}): DatasetImportSummary {
  return {
    adapterMatched: false,
    adapterId: "generic_csv",
    adapterName: "Generic CSV normalization",
    source: "generic_csv",
    confidence: "low",
    fallbackUsed: true,
    mappedFields: [],
    warnings: [],
    ...overrides,
  };
}

describe("dataset readiness", () => {
  it("marks strongly mapped county imports as scoring-ready", () => {
    const readiness = calculateDatasetReadiness({
      sourceRows: [
        sourceRow(2, {
          parcel_id: "A-100",
          lien_amount: "1000",
          estimated_value: "12000",
          property_type: "Single Family Residence",
          address: "100 Main St",
        }),
      ],
      importSummary: importSummary({
        adapterMatched: true,
        adapterId: "maricopa_tax_lien_v1",
        adapterName: "Maricopa-style tax lien CSV",
        source: "county_adapter",
        confidence: "high",
        fallbackUsed: false,
        mappedFields: ["parcel_id", "lien_amount", "estimated_value", "property_type", "address"],
      }),
      validationSummary: validationSummary(),
    });

    expect(readiness.status).toBe("ready");
    expect(readiness.score).toBe(100);
    expect(readiness.scoringRecommended).toBe(true);
    expect(readiness.issues).toEqual([]);
    expect(readiness.fieldCoverage.every((coverage) => coverage.coveragePercent === 100)).toBe(true);
    expect(readiness.guidance[0]).toContain("strong enough");
  });

  it("keeps generic imports with core financial fields as partial and explainable", () => {
    const readiness = calculateDatasetReadiness({
      sourceRows: [sourceRow(2, { parcel_id: "A-100", lien_amount: "1000", estimated_value: "12000" })],
      importSummary: importSummary(),
      validationSummary: validationSummary(),
    });

    expect(readiness.status).toBe("partial");
    expect(readiness.scoringRecommended).toBe(true);
    expect(readiness.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["generic_fallback_used", "missing_property_type", "weak_address_context"]),
    );
    expect(readiness.guidance.join(" ")).toContain("review warnings");
  });

  it("blocks scoring readiness when required value data is absent", () => {
    const readiness = calculateDatasetReadiness({
      sourceRows: [sourceRow(2, { parcel_id: "A-100", lien_amount: "1000" })],
      importSummary: importSummary(),
      validationSummary: validationSummary(),
    });

    expect(readiness.status).toBe("blocked");
    expect(readiness.scoringRecommended).toBe(false);
    expect(readiness.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_estimated_value",
          severity: "error",
          field: "estimated_value",
        }),
      ]),
    );
  });

  it("treats missing parcel identifiers as warnings instead of hard blockers", () => {
    const readiness = calculateDatasetReadiness({
      sourceRows: [sourceRow(2, { lien_amount: "1000", estimated_value: "12000" })],
      importSummary: importSummary(),
      validationSummary: validationSummary(),
    });

    expect(readiness.status).toBe("weak");
    expect(readiness.scoringRecommended).toBe(false);
    expect(readiness.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_parcel_identifier",
          severity: "warning",
          field: "parcel_id",
        }),
        expect.objectContaining({ code: "thin_rows", severity: "warning" }),
      ]),
    );
  });

  it("warns when a county adapter matched with low confidence", () => {
    const readiness = calculateDatasetReadiness({
      sourceRows: [sourceRow(2, { parcel_id: "A-100", lien_amount: "1000", estimated_value: "12000" })],
      importSummary: importSummary({
        adapterMatched: true,
        adapterId: "maricopa_tax_lien_v1",
        adapterName: "Maricopa-style tax lien CSV",
        source: "county_adapter",
        confidence: "low",
        fallbackUsed: false,
        mappedFields: ["parcel_id", "lien_amount", "estimated_value"],
        warnings: ["Maricopa-style adapter matched with limited confidence; generic scoring safeguards remain active."],
      }),
      validationSummary: validationSummary(),
    });

    expect(readiness.status).toBe("partial");
    expect(readiness.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["low_confidence_adapter_match", "import_warning"]),
    );
  });
});
