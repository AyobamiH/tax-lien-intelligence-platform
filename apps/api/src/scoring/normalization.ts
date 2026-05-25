import { assessPropertyType, type ScoreableRecord } from "@tax-lien/scoring";
import type { NormalizedScoredRecordFields } from "@tax-lien/types";
import type { StoredDatasetSourceRow } from "../datasets/dataset-store.js";

export interface NormalizedDatasetRow {
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  scoreableRecord: ScoreableRecord;
  warnings: string[];
}

const parcelIdHeaders = ["parcel_id", "parcel id", "parcelid", "apn", "account", "property id", "tax id", "tax_id"];
const lienAmountHeaders = [
  "lien_amount",
  "lien amount",
  "lien",
  "amount due",
  "tax due",
  "delinquent amount",
  "minimum bid",
];
const estimatedValueHeaders = [
  "estimated_value",
  "estimated value",
  "market value",
  "assessed value",
  "property value",
  "value",
];
const propertyTypeHeaders = ["property_type", "property type", "land use", "use", "class", "property class"];
const addressHeaders = ["address", "situs address", "property address", "site address"];
const roadAccessHeaders = ["road access", "road_access", "access"];
const buildableHeaders = ["buildable", "buildable status"];
const utilitiesHeaders = ["utilities", "utilities available", "utility access"];

export function normalizeDatasetRow(sourceRow: StoredDatasetSourceRow): NormalizedDatasetRow {
  const parcelId = trimOptional(findFieldValue(sourceRow.fields, parcelIdHeaders));
  const lienAmount = parseMoney(findFieldValue(sourceRow.fields, lienAmountHeaders));
  const estimatedValue = parseMoney(findFieldValue(sourceRow.fields, estimatedValueHeaders));
  const propertyType = trimOptional(findFieldValue(sourceRow.fields, propertyTypeHeaders));
  const address = trimOptional(findFieldValue(sourceRow.fields, addressHeaders));
  const roadAccess = parseBooleanSignal(findFieldValue(sourceRow.fields, roadAccessHeaders));
  const buildable = parseBooleanSignal(findFieldValue(sourceRow.fields, buildableHeaders));
  const utilitiesAvailable = parseBooleanSignal(findFieldValue(sourceRow.fields, utilitiesHeaders));
  const propertyTypeCategory = assessPropertyType(propertyType).category;
  const warnings = buildNormalizationWarnings({
    parcelId,
    lienAmount,
    estimatedValue,
    propertyType,
  });

  const normalizedFields: NormalizedScoredRecordFields = {
    propertyTypeCategory,
    ...(parcelId ? { parcelId } : {}),
    ...(lienAmount !== undefined ? { lienAmount } : {}),
    ...(estimatedValue !== undefined ? { estimatedValue } : {}),
    ...(propertyType ? { propertyType } : {}),
    ...(address ? { address } : {}),
  };

  const scoreableRecord: ScoreableRecord = {
    ...(parcelId ? { parcelId } : {}),
    ...(lienAmount !== undefined ? { lienAmount } : {}),
    ...(estimatedValue !== undefined ? { estimatedValue } : {}),
    ...(propertyType ? { propertyType } : {}),
    ...(roadAccess !== undefined ? { roadAccess } : {}),
    ...(buildable !== undefined ? { buildable } : {}),
    ...(utilitiesAvailable !== undefined ? { utilitiesAvailable } : {}),
  };

  return {
    sourceRowNumber: sourceRow.rowNumber,
    normalizedFields,
    scoreableRecord,
    warnings,
  };
}

function findFieldValue(fields: Record<string, string>, candidateHeaders: string[]): string | undefined {
  const normalizedCandidates = new Set(candidateHeaders.map(normalizeHeader));
  const matchingEntry = Object.entries(fields).find(([header]) => normalizedCandidates.has(normalizeHeader(header)));
  return matchingEntry?.[1];
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replaceAll(/[\s-]+/g, " ");
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

function parseBooleanSignal(value: string | undefined): boolean | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (["yes", "y", "true", "1", "available", "present"].includes(normalized)) {
    return true;
  }

  if (["no", "n", "false", "0", "none", "unavailable", "absent"].includes(normalized)) {
    return false;
  }

  return undefined;
}

function buildNormalizationWarnings(input: {
  parcelId: string | undefined;
  lienAmount: number | undefined;
  estimatedValue: number | undefined;
  propertyType: string | undefined;
}): string[] {
  const warnings: string[] = [];

  if (!input.parcelId) {
    warnings.push("No parcel identifier column could be mapped.");
  }

  if (input.lienAmount === undefined) {
    warnings.push("No positive lien amount could be mapped.");
  }

  if (input.estimatedValue === undefined) {
    warnings.push("No positive property value could be mapped.");
  }

  if (!input.propertyType) {
    warnings.push("No property type could be mapped.");
  }

  return warnings;
}
