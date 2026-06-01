import { describe, expect, it } from "vitest";
import {
  applyCountyImportAdapters,
  genericImportSummary,
  maricopaTaxLienAdapter,
} from "../../apps/api/src/datasets/import-adapters.js";
import type { CsvParseResult } from "../../apps/api/src/datasets/csv-parser.js";

function parsedCsv(overrides: Partial<CsvParseResult>): CsvParseResult {
  return {
    originalFilename: "county.csv",
    rowCount: 1,
    columnCount: overrides.headers?.length ?? 0,
    headers: [],
    sourceRows: [],
    totalRows: 1,
    validRows: 1,
    invalidRows: 0,
    warnings: [],
    ...overrides,
  };
}

describe("county import adapters", () => {
  it("matches a Maricopa-style tax lien export and adds canonical fields", () => {
    const result = applyCountyImportAdapters(
      parsedCsv({
        headers: [
          "APN",
          "Total Due",
          "Full Cash Value",
          "Property Use Description",
          "Situs Street",
          "Situs City",
          "Situs State",
          "Situs Zip",
        ],
        sourceRows: [
          {
            rowNumber: 2,
            fields: {
              APN: "123-45-678",
              "Total Due": "$1,250.50",
              "Full Cash Value": "$85,000",
              "Property Use Description": "Single Family Residence",
              "Situs Street": "100 Main St",
              "Situs City": "Phoenix",
              "Situs State": "AZ",
              "Situs Zip": "85001",
            },
          },
        ],
      }),
    );

    expect(result.importSummary).toMatchObject({
      adapterMatched: true,
      adapterId: "maricopa_tax_lien_v1",
      adapterName: "Maricopa-style tax lien CSV",
      source: "county_adapter",
      confidence: "high",
      fallbackUsed: false,
      mappedFields: ["parcel_id", "lien_amount", "estimated_value", "property_type", "address"],
      warnings: [],
    });
    expect(result.sourceRows[0]?.fields).toMatchObject({
      parcel_id: "123-45-678",
      lien_amount: "$1,250.50",
      estimated_value: "$85,000",
      property_type: "Single Family Residence",
      address: "100 Main St Phoenix AZ 85001",
    });
  });

  it("uses generic fallback when no county adapter applies", () => {
    const result = applyCountyImportAdapters(
      parsedCsv({
        headers: ["parcel_id", "lien_amount", "estimated_value"],
        sourceRows: [{ rowNumber: 2, fields: { parcel_id: "A-1", lien_amount: "1000", estimated_value: "12000" } }],
      }),
    );

    expect(result.importSummary).toEqual(genericImportSummary());
    expect(result.sourceRows[0]?.fields).toEqual({
      parcel_id: "A-1",
      lien_amount: "1000",
      estimated_value: "12000",
    });
  });

  it("handles partial Maricopa-style files honestly with limited confidence warnings", () => {
    const result = applyCountyImportAdapters(
      parsedCsv({
        headers: ["APN", "Total Due"],
        sourceRows: [
          {
            rowNumber: 2,
            fields: {
              APN: "123-45-678",
              "Total Due": "$1,250.50",
            },
          },
        ],
      }),
    );

    expect(result.importSummary).toMatchObject({
      adapterMatched: true,
      adapterId: "maricopa_tax_lien_v1",
      confidence: "low",
      mappedFields: ["parcel_id", "lien_amount"],
      warnings: [
        "Maricopa-style adapter matched with limited confidence; generic scoring safeguards remain active.",
        "Maricopa-style adapter could not map estimated_value.",
        "Maricopa-style adapter could not map property_type.",
      ],
    });
    expect(result.sourceRows[0]?.fields).toMatchObject({
      parcel_id: "123-45-678",
      lien_amount: "$1,250.50",
    });
  });

  it("does not match Maricopa-style input without parcel identifier evidence", () => {
    const detection = maricopaTaxLienAdapter.detect({
      headers: ["Total Due", "Full Cash Value", "Property Use Description"],
      sourceRows: [],
    });

    expect(detection).toMatchObject({
      matched: false,
      confidence: "medium",
      evidence: ["lien_amount", "estimated_value", "property_type"],
    });
  });
});
