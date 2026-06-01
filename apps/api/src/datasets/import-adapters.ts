import type { DatasetImportSummary } from "@tax-lien/types";
import type { CsvParseResult, CsvSourceRow } from "./csv-parser.js";

export interface CountyImportAdapter {
  id: DatasetImportSummary["adapterId"];
  name: string;
  detect(input: CountyImportInput): CountyImportDetection;
  apply(input: CountyImportInput, detection: CountyImportDetection): CountyImportResult;
}

export interface CountyImportInput {
  headers: string[];
  sourceRows: CsvSourceRow[];
}

export interface CountyImportDetection {
  matched: boolean;
  confidence: DatasetImportSummary["confidence"];
  evidence: string[];
}

export interface CountyImportResult {
  sourceRows: CsvSourceRow[];
  importSummary: DatasetImportSummary;
}

type CanonicalField = "parcel_id" | "lien_amount" | "estimated_value" | "property_type" | "address";

interface FieldMapping {
  canonicalField: CanonicalField;
  label: string;
  headers: string[];
}

const maricopaFieldMappings: FieldMapping[] = [
  {
    canonicalField: "parcel_id",
    label: "parcel identifier",
    headers: ["apn", "parcel number", "parcel no", "assessor parcel number"],
  },
  {
    canonicalField: "lien_amount",
    label: "lien amount",
    headers: ["total due", "tax due", "amount due", "delinquent tax", "delinquent amount", "minimum bid"],
  },
  {
    canonicalField: "estimated_value",
    label: "estimated value",
    headers: [
      "full cash value",
      "fcv",
      "market value",
      "limited property value",
      "lpv",
      "assessed value",
      "valuation",
    ],
  },
  {
    canonicalField: "property_type",
    label: "property type",
    headers: ["property use", "property use description", "use code", "legal class", "property class"],
  },
  {
    canonicalField: "address",
    label: "situs address",
    headers: ["situs address", "site address", "property address", "situs street", "situs full address"],
  },
];

const maricopaComponentAddressHeaders = {
  street: ["situs street", "situs address"],
  city: ["situs city", "property city"],
  state: ["situs state", "property state"],
  zip: ["situs zip", "situs zipcode", "situs zip code", "property zip"],
};

export const maricopaTaxLienAdapter: CountyImportAdapter = {
  id: "maricopa_tax_lien_v1",
  name: "Maricopa-style tax lien CSV",
  detect(input) {
    const evidence = maricopaFieldMappings.flatMap((mapping) =>
      hasAnyHeader(input.headers, mapping.headers) ? [mapping.canonicalField] : [],
    );
    const hasMaricopaParcelIdentifier = hasAnyHeader(input.headers, [
      "apn",
      "assessor parcel number",
      "parcel number",
      "parcel no",
    ]);
    const hasParcel = evidence.includes("parcel_id") && hasMaricopaParcelIdentifier;
    const matched = hasParcel && evidence.length >= 2;

    return {
      matched,
      confidence: evidence.length >= 4 ? "high" : evidence.length >= 3 ? "medium" : "low",
      evidence,
    };
  },
  apply(input, detection) {
    const mappedFields = maricopaFieldMappings.flatMap((mapping) =>
      hasAnyHeader(input.headers, mapping.headers) ? [mapping.canonicalField] : [],
    );
    const sourceRows = input.sourceRows.map((sourceRow) => ({
      rowNumber: sourceRow.rowNumber,
      fields: applyMappingsToRow(sourceRow.fields),
    }));
    const missingCoreFields = missingFields(["parcel_id", "lien_amount", "estimated_value", "property_type"], mappedFields);
    const warnings = [
      ...(detection.confidence === "low"
        ? ["Maricopa-style adapter matched with limited confidence; generic scoring safeguards remain active."]
        : []),
      ...missingCoreFields.map((field) => `Maricopa-style adapter could not map ${field}.`),
    ];

    return {
      sourceRows,
      importSummary: {
        adapterMatched: true,
        adapterId: this.id,
        adapterName: this.name,
        source: "county_adapter",
        confidence: detection.confidence,
        fallbackUsed: false,
        mappedFields,
        warnings,
      },
    };
  },
};

const defaultCountyImportAdapters: CountyImportAdapter[] = [maricopaTaxLienAdapter];

export function applyCountyImportAdapters(
  parsedCsv: CsvParseResult,
  adapters: CountyImportAdapter[] = defaultCountyImportAdapters,
): CountyImportResult {
  const input: CountyImportInput = {
    headers: parsedCsv.headers,
    sourceRows: parsedCsv.sourceRows,
  };

  for (const adapter of adapters) {
    const detection = adapter.detect(input);
    if (detection.matched) {
      return adapter.apply(input, detection);
    }
  }

  return {
    sourceRows: parsedCsv.sourceRows,
    importSummary: genericImportSummary(),
  };
}

export function genericImportSummary(): DatasetImportSummary {
  return {
    adapterMatched: false,
    adapterId: "generic_csv",
    adapterName: "Generic CSV normalization",
    source: "generic_csv",
    confidence: "low",
    fallbackUsed: true,
    mappedFields: [],
    warnings: [],
  };
}

function applyMappingsToRow(fields: Record<string, string>): Record<string, string> {
  const mappedFields = { ...fields };

  for (const mapping of maricopaFieldMappings) {
    const value = firstFieldValue(fields, mapping.headers);
    if (value) {
      applyCanonicalField(mappedFields, mapping.canonicalField, value);
    }
  }

  const componentAddress = buildComponentAddress(fields);
  if (componentAddress) {
    mappedFields.address = componentAddress.slice(0, 255);
  }

  return mappedFields;
}

function applyCanonicalField(fields: Record<string, string>, field: CanonicalField, value: string): void {
  const trimmed = value.trim();
  if (trimmed && !fields[field]?.trim()) {
    fields[field] = trimmed.slice(0, 255);
  }
}

function buildComponentAddress(fields: Record<string, string>): string | undefined {
  const street = firstFieldValue(fields, maricopaComponentAddressHeaders.street);
  const city = firstFieldValue(fields, maricopaComponentAddressHeaders.city);
  const state = firstFieldValue(fields, maricopaComponentAddressHeaders.state);
  const zip = firstFieldValue(fields, maricopaComponentAddressHeaders.zip);
  const value = [street, city, state, zip].filter(Boolean).join(" ").trim();
  return value || undefined;
}

function firstFieldValue(fields: Record<string, string>, headers: string[]): string | undefined {
  const normalizedHeaders = new Set(headers.map(normalizeHeader));
  const match = Object.entries(fields).find(
    ([header, value]) => normalizedHeaders.has(normalizeHeader(header)) && value.trim().length > 0,
  );
  return match?.[1].trim();
}

function hasAnyHeader(headers: string[], candidates: string[]): boolean {
  const normalizedHeaders = new Set(headers.map(normalizeHeader));
  return candidates.some((candidate) => normalizedHeaders.has(normalizeHeader(candidate)));
}

function missingFields(requiredFields: CanonicalField[], mappedFields: CanonicalField[]): string[] {
  const mapped = new Set(mappedFields);
  return requiredFields.filter((field) => !mapped.has(field));
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replaceAll(/[_\s-]+/g, " ");
}
