import type {
  EnrichedScoredRecordFields,
  EnrichmentAdapterId,
  EnrichmentResult,
  EnrichmentSignal,
  NormalizedScoredRecordFields,
} from "@tax-lien/types";
import type { ScoreableRecord } from "@tax-lien/scoring";
import type { StoredDatasetSourceRow } from "../datasets/dataset-store.js";
import type { NormalizedDatasetRow } from "../scoring/normalization.js";
import { SourceFieldInferenceAdapter } from "./source-field-inference-adapter.js";

export interface EnrichmentAdapterInput {
  sourceRow: StoredDatasetSourceRow;
  normalizedFields: NormalizedScoredRecordFields;
  scoreableRecord: ScoreableRecord;
}

export interface EnrichmentAdapterResult {
  inferredFields: EnrichedScoredRecordFields;
  signals: EnrichmentSignal[];
  flags: string[];
  reasoning: string[];
}

export interface EnrichmentAdapter {
  id: EnrichmentAdapterId;
  enrich(input: EnrichmentAdapterInput): EnrichmentAdapterResult;
}

export interface EnrichedDatasetRow {
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  scoreableRecord: ScoreableRecord;
  enrichment: EnrichmentResult;
}

export class EnrichmentService {
  private readonly adapters: EnrichmentAdapter[];

  public constructor(adapters: EnrichmentAdapter[]) {
    this.adapters = adapters;
  }

  public enrichRow(sourceRow: StoredDatasetSourceRow, normalizedRow: NormalizedDatasetRow): EnrichedDatasetRow {
    const normalizedFields: NormalizedScoredRecordFields = {
      ...normalizedRow.normalizedFields,
    };
    const scoreableRecord: ScoreableRecord = {
      ...normalizedRow.scoreableRecord,
    };
    const inferredFields: EnrichedScoredRecordFields = {};
    const signals: EnrichmentSignal[] = [];
    const flags: string[] = [];
    const reasoning: string[] = [];
    const adapters: EnrichmentAdapterId[] = [];

    for (const adapter of this.adapters) {
      adapters.push(adapter.id);
      try {
        const result = adapter.enrich({
          sourceRow,
          normalizedFields,
          scoreableRecord,
        });

        applyInferredFields(result.inferredFields, {
          normalizedFields,
          scoreableRecord,
          inferredFields,
        });
        signals.push(...result.signals);
        flags.push(...result.flags);
        reasoning.push(...result.reasoning);
      } catch {
        flags.push(`Enrichment adapter ${adapter.id} failed safely`);
        reasoning.push(`Enrichment adapter ${adapter.id} could not improve this row, so scoring used available normalized data.`);
      }
    }

    const dataQualityScore = computeDataQualityScore(normalizedFields);
    signals.push({
      adapterId: "source_field_inference",
      field: "dataQuality",
      confidence: dataQualityScore >= 80 ? "high" : dataQualityScore >= 55 ? "medium" : "low",
      message: `Source-row data quality is ${dataQualityScore}/100 after enrichment.`,
    });
    reasoning.push(`Enrichment data quality score is ${dataQualityScore}/100 based on mapped core fields.`);

    if (dataQualityScore < 55) {
      flags.push("Enrichment found weak source-row completeness");
    }

    return {
      sourceRowNumber: normalizedRow.sourceRowNumber,
      normalizedFields,
      scoreableRecord,
      enrichment: {
        adapters: uniqueAdapters(adapters),
        dataQualityScore,
        inferredFields,
        signals: uniqueSignals(signals),
        flags: uniqueStrings(flags),
        reasoning: uniqueStrings(reasoning),
      },
    };
  }
}

export function createDefaultEnrichmentService(): EnrichmentService {
  return new EnrichmentService([new SourceFieldInferenceAdapter()]);
}

function applyInferredFields(
  inferred: EnrichedScoredRecordFields,
  target: {
    normalizedFields: NormalizedScoredRecordFields;
    scoreableRecord: ScoreableRecord;
    inferredFields: EnrichedScoredRecordFields;
  },
): void {
  if (inferred.parcelId && !target.normalizedFields.parcelId) {
    target.normalizedFields.parcelId = inferred.parcelId;
    target.scoreableRecord.parcelId = inferred.parcelId;
    target.inferredFields.parcelId = inferred.parcelId;
  }

  if (inferred.lienAmount !== undefined && target.normalizedFields.lienAmount === undefined) {
    target.normalizedFields.lienAmount = inferred.lienAmount;
    target.scoreableRecord.lienAmount = inferred.lienAmount;
    target.inferredFields.lienAmount = inferred.lienAmount;
  }

  if (inferred.estimatedValue !== undefined && target.normalizedFields.estimatedValue === undefined) {
    target.normalizedFields.estimatedValue = inferred.estimatedValue;
    target.scoreableRecord.estimatedValue = inferred.estimatedValue;
    target.inferredFields.estimatedValue = inferred.estimatedValue;
  }

  if (
    inferred.propertyType &&
    (!target.normalizedFields.propertyType || target.normalizedFields.propertyTypeCategory === "unknown")
  ) {
    target.normalizedFields.propertyType = inferred.propertyType;
    target.scoreableRecord.propertyType = inferred.propertyType;
    target.inferredFields.propertyType = inferred.propertyType;

    if (inferred.propertyTypeCategory) {
      target.normalizedFields.propertyTypeCategory = inferred.propertyTypeCategory;
      target.inferredFields.propertyTypeCategory = inferred.propertyTypeCategory;
    }
  }

  if (inferred.address && !target.normalizedFields.address) {
    target.normalizedFields.address = inferred.address;
    target.inferredFields.address = inferred.address;
  }
}

function computeDataQualityScore(fields: NormalizedScoredRecordFields): number {
  let score = 20;

  if (fields.parcelId) {
    score += 15;
  }

  if (fields.lienAmount !== undefined) {
    score += 20;
  }

  if (fields.estimatedValue !== undefined) {
    score += 20;
  }

  if (fields.propertyType && fields.propertyTypeCategory !== "unknown") {
    score += 15;
  } else if (fields.propertyType) {
    score += 5;
  }

  if (fields.address) {
    score += 10;
  }

  return Math.min(score, 100);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function uniqueAdapters(values: EnrichmentAdapterId[]): EnrichmentAdapterId[] {
  return [...new Set(values)];
}

function uniqueSignals(values: EnrichmentSignal[]): EnrichmentSignal[] {
  const seen = new Set<string>();
  const unique: EnrichmentSignal[] = [];

  for (const signal of values) {
    const key = `${signal.adapterId}:${signal.field}:${signal.message}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(signal);
  }

  return unique;
}
