import { assessPropertyType } from "@tax-lien/scoring";
import type { EnrichedScoredRecordFields, EnrichmentSignal } from "@tax-lien/types";
import type { EnrichmentAdapter, EnrichmentAdapterInput, EnrichmentAdapterResult } from "./enrichment-service.js";

export class SourceFieldInferenceAdapter implements EnrichmentAdapter {
  public readonly id = "source_field_inference" as const;

  public enrich(input: EnrichmentAdapterInput): EnrichmentAdapterResult {
    const inferredFields: EnrichedScoredRecordFields = {};
    const signals: EnrichmentSignal[] = [];
    const reasoning: string[] = [];

    const parcelId = trimOptional(findFieldValue(input.sourceRow.fields, parcelIdHeaders));
    if (parcelId && !input.normalizedFields.parcelId) {
      inferredFields.parcelId = parcelId;
      signals.push(signal("parcelId", "high", "Parcel identifier inferred from source field aliases."));
      reasoning.push("Enrichment inferred a parcel identifier from alternate source headers.");
    }

    const lienAmount = parseMoney(findFieldValue(input.sourceRow.fields, lienAmountHeaders));
    if (lienAmount !== undefined && input.normalizedFields.lienAmount === undefined) {
      inferredFields.lienAmount = lienAmount;
      signals.push(signal("lienAmount", "high", "Lien amount inferred from alternate tax/lien amount headers."));
      reasoning.push("Enrichment inferred lien amount from alternate amount headers.");
    }

    const estimatedValue =
      parseMoney(findFieldValue(input.sourceRow.fields, estimatedValueHeaders)) ??
      deriveValueFromComponents(input.sourceRow.fields);
    if (estimatedValue !== undefined && input.normalizedFields.estimatedValue === undefined) {
      inferredFields.estimatedValue = estimatedValue;
      signals.push(signal("estimatedValue", "medium", "Property value inferred from alternate value fields."));
      reasoning.push("Enrichment inferred property value from alternate assessed or market value fields.");
    }

    const propertyType = trimOptional(findFieldValue(input.sourceRow.fields, propertyTypeHeaders));
    if (
      propertyType &&
      (!input.normalizedFields.propertyType || input.normalizedFields.propertyTypeCategory === "unknown")
    ) {
      const propertyTypeAssessment = assessPropertyType(propertyType);
      if (propertyTypeAssessment.category !== "unknown") {
        inferredFields.propertyType = propertyType;
        inferredFields.propertyTypeCategory = propertyTypeAssessment.category;
        signals.push(signal("propertyType", "medium", "Property type inferred from alternate use/classification fields."));
        reasoning.push(`Enrichment inferred property type from source text: ${propertyType}.`);
      }
    }

    const address = trimOptional(findFieldValue(input.sourceRow.fields, addressHeaders)) ?? buildAddress(input.sourceRow.fields);
    if (address && !input.normalizedFields.address) {
      inferredFields.address = address;
      signals.push(signal("address", "medium", "Address inferred from alternate or component address fields."));
      reasoning.push("Enrichment prepared an address from source address fields.");
    }

    return {
      inferredFields,
      signals,
      flags: [],
      reasoning,
    };
  }
}

const parcelIdHeaders = [
  "parcel id",
  "parcelid",
  "parcel number",
  "apn",
  "account",
  "account number",
  "property id",
  "tax id",
];
const lienAmountHeaders = [
  "lien amount",
  "lien amount due",
  "tax due",
  "tax_due",
  "taxes due",
  "amount due",
  "delinquent tax",
  "delinquent taxes",
  "delinquent amount",
  "minimum bid",
  "certificate amount",
];
const estimatedValueHeaders = [
  "estimated value",
  "market value",
  "market total",
  "total market value",
  "assessed value",
  "total assessed value",
  "assessed total",
  "appraised value",
  "just value",
  "property value",
  "total value",
];
const landValueHeaders = ["land value", "assessed land value", "market land value", "land market value"];
const improvementValueHeaders = [
  "improvement value",
  "building value",
  "assessed building value",
  "market improvement value",
  "improvements value",
];
const propertyTypeHeaders = [
  "property type",
  "land use",
  "land use description",
  "use",
  "use code",
  "use code description",
  "use description",
  "property use",
  "property class",
  "property description",
  "improvement type",
  "building type",
  "zoning description",
  "class description",
];
const addressHeaders = ["address", "situs", "situs address", "property address", "property location", "site address"];
const streetHeaders = ["street", "street address", "situs street", "property street", "site street"];
const cityHeaders = ["city", "situs city", "property city", "site city"];
const stateHeaders = ["state", "situs state", "property state", "site state"];
const zipHeaders = ["zip", "zipcode", "zip code", "postal code", "situs zip", "property zip"];

function signal(field: EnrichmentSignal["field"], confidence: EnrichmentSignal["confidence"], message: string): EnrichmentSignal {
  return {
    adapterId: "source_field_inference",
    field,
    confidence,
    message,
  };
}

function findFieldValue(fields: Record<string, string>, candidateHeaders: string[]): string | undefined {
  const normalizedCandidates = new Set(candidateHeaders.map(normalizeHeader));
  const matchingEntry = Object.entries(fields).find(([header]) => normalizedCandidates.has(normalizeHeader(header)));
  return matchingEntry?.[1];
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replaceAll(/[_\s-]+/g, " ");
}

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 255) : undefined;
}

function parseMoney(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const cleaned = trimmed.replaceAll(/[$£,\s]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return undefined;
  }

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function deriveValueFromComponents(fields: Record<string, string>): number | undefined {
  const landValue = parseMoney(findFieldValue(fields, landValueHeaders));
  const improvementValue = parseMoney(findFieldValue(fields, improvementValueHeaders));
  if (landValue === undefined || improvementValue === undefined) {
    return undefined;
  }

  const total = landValue + improvementValue;
  return total > 0 ? total : undefined;
}

function buildAddress(fields: Record<string, string>): string | undefined {
  const street = trimOptional(findFieldValue(fields, streetHeaders));
  if (!street) {
    return undefined;
  }

  const city = trimOptional(findFieldValue(fields, cityHeaders));
  const state = trimOptional(findFieldValue(fields, stateHeaders));
  const zip = trimOptional(findFieldValue(fields, zipHeaders));
  const locality = [city, state].filter(Boolean).join(", ");
  return [street, locality, zip].filter(Boolean).join(" ").slice(0, 255);
}
