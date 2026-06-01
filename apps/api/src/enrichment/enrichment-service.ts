import type {
  EnrichmentAdapterOutcome,
  EnrichedScoredRecordFields,
  EnrichmentAdapterId,
  EnrichmentAdapterStage,
  EnrichmentFreshness,
  EnrichmentResult,
  EnrichmentSignal,
  ExternalEnrichmentProvider,
  ExternalEnrichmentResult,
  NormalizedScoredRecordFields,
} from "@tax-lien/types";
import type { ScoreableRecord } from "@tax-lien/scoring";
import type { StoredDatasetSourceRow } from "../datasets/dataset-store.js";
import type { NormalizedDatasetRow } from "../scoring/normalization.js";
import { CensusGeocoderAddressAdapter } from "./census-geocoder-adapter.js";
import { HttpCensusGeocoderClient } from "./census-geocoder-client.js";
import { SourceFieldInferenceAdapter } from "./source-field-inference-adapter.js";

export interface EnrichmentAdapterInput {
  sourceRow: StoredDatasetSourceRow;
  normalizedFields: NormalizedScoredRecordFields;
  scoreableRecord: ScoreableRecord;
}

export interface EnrichmentAdapterResult {
  inferredFields: EnrichedScoredRecordFields;
  externalResults?: ExternalEnrichmentResult[];
  signals: EnrichmentSignal[];
  flags: string[];
  reasoning: string[];
}

export interface EnrichmentAdapter {
  id: EnrichmentAdapterId;
  enrich(input: EnrichmentAdapterInput): EnrichmentAdapterResult | Promise<EnrichmentAdapterResult>;
}

export interface DisabledEnrichmentAdapterStep {
  id: EnrichmentAdapterId;
  stage: EnrichmentAdapterStage;
  message: string;
  externalProvider?: ExternalEnrichmentProvider;
}

export interface EnrichmentServiceOptions {
  disabledAdapters?: DisabledEnrichmentAdapterStep[];
  freshnessWindowDays?: number;
  now?: () => Date;
  sourceVersion?: string;
}

export interface EnrichedDatasetRow {
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  scoreableRecord: ScoreableRecord;
  enrichment: EnrichmentResult;
}

export class EnrichmentService {
  private readonly orchestrator: EnrichmentOrchestrator;

  public constructor(adapters: EnrichmentAdapter[], options: EnrichmentServiceOptions = {}) {
    this.orchestrator = new EnrichmentOrchestrator(
      [
        ...adapters.map((adapter) => ({
          id: adapter.id,
          stage: adapterStage(adapter.id),
          adapter,
        })),
        ...(options.disabledAdapters ?? []).map((disabledAdapter) => ({
          id: disabledAdapter.id,
          stage: disabledAdapter.stage,
          disabledReason: disabledAdapter.message,
          ...(disabledAdapter.externalProvider ? { externalProvider: disabledAdapter.externalProvider } : {}),
        })),
      ],
      {
        freshnessWindowDays: options.freshnessWindowDays ?? 30,
        now: options.now ?? (() => new Date()),
        sourceVersion: options.sourceVersion ?? "source_field_inference@1",
      },
    );
  }

  public async enrichRow(sourceRow: StoredDatasetSourceRow, normalizedRow: NormalizedDatasetRow): Promise<EnrichedDatasetRow> {
    return this.orchestrator.enrichRow(sourceRow, normalizedRow);
  }
}

interface EnrichmentPipelineStep {
  id: EnrichmentAdapterId;
  stage: EnrichmentAdapterStage;
  adapter?: EnrichmentAdapter;
  disabledReason?: string;
  externalProvider?: ExternalEnrichmentProvider;
}

interface EnrichmentOrchestratorOptions {
  freshnessWindowDays: number;
  now: () => Date;
  sourceVersion: string;
}

export const ENRICHMENT_ORCHESTRATION_VERSION = "enrichment-orchestration-v1";

export class EnrichmentOrchestrator {
  private readonly pipeline: EnrichmentPipelineStep[];
  private readonly freshnessWindowDays: number;
  private readonly now: () => Date;
  private readonly sourceVersion: string;

  public constructor(pipeline: EnrichmentPipelineStep[], options: EnrichmentOrchestratorOptions) {
    this.pipeline = pipeline;
    this.freshnessWindowDays = options.freshnessWindowDays;
    this.now = options.now;
    this.sourceVersion = options.sourceVersion;
  }

  public async enrichRow(sourceRow: StoredDatasetSourceRow, normalizedRow: NormalizedDatasetRow): Promise<EnrichedDatasetRow> {
    const normalizedFields: NormalizedScoredRecordFields = {
      ...normalizedRow.normalizedFields,
    };
    const scoreableRecord: ScoreableRecord = {
      ...normalizedRow.scoreableRecord,
    };
    const inferredFields: EnrichedScoredRecordFields = {};
    const signals: EnrichmentSignal[] = [];
    const externalResults: ExternalEnrichmentResult[] = [];
    const adapterOutcomes: EnrichmentAdapterOutcome[] = [];
    const flags: string[] = [];
    const reasoning: string[] = [];
    const adapters: EnrichmentAdapterId[] = [];

    for (const step of this.pipeline) {
      const startedAt = this.now();

      if (!step.adapter) {
        const completedAt = this.now();
        adapterOutcomes.push({
          adapterId: step.id,
          stage: step.stage,
          status: "skipped",
          message: step.disabledReason ?? "Adapter disabled by configuration.",
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
        });

        if (step.externalProvider) {
          externalResults.push({
            adapterId: step.id,
            provider: step.externalProvider,
            status: "skipped",
            confidence: "low",
            message: step.disabledReason ?? "External enrichment adapter disabled by configuration.",
            enrichedAt: completedAt.toISOString(),
          });
          signals.push({
            adapterId: step.id,
            field: "externalLocation",
            confidence: "low",
            message: step.disabledReason ?? "External enrichment adapter disabled by configuration.",
          });
          reasoning.push(step.disabledReason ?? "External enrichment adapter disabled by configuration.");
        }

        continue;
      }

      adapters.push(step.id);
      try {
        const result = await step.adapter.enrich({
          sourceRow,
          normalizedFields,
          scoreableRecord,
        });

        applyInferredFields(result.inferredFields, {
          normalizedFields,
          scoreableRecord,
          inferredFields,
        });
        externalResults.push(...(result.externalResults ?? []));
        signals.push(...result.signals);
        flags.push(...result.flags);
        reasoning.push(...result.reasoning);
        const completedAt = this.now();
        adapterOutcomes.push({
          adapterId: step.id,
          stage: step.stage,
          status: adapterOutcomeStatus(result),
          message: adapterOutcomeMessage(result),
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
        });
      } catch {
        const completedAt = this.now();
        const message = `Enrichment adapter ${step.id} failed safely`;
        flags.push(message);
        reasoning.push(`Enrichment adapter ${step.id} could not improve this row, so scoring used available normalized data.`);
        adapterOutcomes.push({
          adapterId: step.id,
          stage: step.stage,
          status: "failed",
          message,
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
        });

        if (step.externalProvider) {
          externalResults.push({
            adapterId: step.id,
            provider: step.externalProvider,
            status: "failed",
            confidence: "low",
            message,
            enrichedAt: completedAt.toISOString(),
          });
        }
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

    const runCompletedAt = this.now();
    const freshness = buildFreshness({
      enrichedAt: runCompletedAt,
      freshnessWindowDays: this.freshnessWindowDays,
      sourceVersion: this.sourceVersion,
    });

    return {
      sourceRowNumber: normalizedRow.sourceRowNumber,
      normalizedFields,
      scoreableRecord,
      enrichment: {
        adapters: uniqueAdapters(adapters),
        orchestrationVersion: ENRICHMENT_ORCHESTRATION_VERSION,
        enrichedAt: runCompletedAt.toISOString(),
        adapterOutcomes: uniqueAdapterOutcomes(adapterOutcomes),
        freshness,
        dataQualityScore,
        inferredFields,
        ...(externalResults.length > 0 ? { externalResults: uniqueExternalResults(externalResults) } : {}),
        signals: uniqueSignals(signals),
        flags: uniqueStrings(flags),
        reasoning: uniqueStrings(reasoning),
      },
    };
  }
}

export interface CensusGeocoderEnrichmentConfig {
  enabled: boolean;
  baseUrl: string;
  benchmark: string;
  timeoutMs: number;
  maxRowsPerJob: number;
}

export interface EnrichmentServiceConfig {
  censusGeocoder: CensusGeocoderEnrichmentConfig;
  freshnessWindowDays?: number;
}

export function createDefaultEnrichmentService(config?: EnrichmentServiceConfig): EnrichmentService {
  const adapters: EnrichmentAdapter[] = [new SourceFieldInferenceAdapter()];
  const disabledAdapters: DisabledEnrichmentAdapterStep[] = [];
  const sourceVersionParts = ["source_field_inference@1"];

  if (config?.censusGeocoder.enabled) {
    sourceVersionParts.push(`census_geocoder@${safeSourceVersionSegment(config.censusGeocoder.benchmark)}`);
    adapters.push(
      new CensusGeocoderAddressAdapter(
        new HttpCensusGeocoderClient({
          baseUrl: config.censusGeocoder.baseUrl,
          benchmark: config.censusGeocoder.benchmark,
          timeoutMs: config.censusGeocoder.timeoutMs,
        }),
        {
          maxRowsPerJob: config.censusGeocoder.maxRowsPerJob,
        },
      ),
    );
  } else if (config?.censusGeocoder) {
    sourceVersionParts.push("census_geocoder@disabled");
    disabledAdapters.push({
      id: "census_geocoder",
      stage: "external",
      externalProvider: "us_census_geocoder",
      message: "Census Geocoder enrichment is disabled by configuration.",
    });
  }

  const options: EnrichmentServiceOptions = {
    disabledAdapters,
    sourceVersion: sourceVersionParts.join("+"),
  };

  if (config?.freshnessWindowDays !== undefined) {
    options.freshnessWindowDays = config.freshnessWindowDays;
  }

  return new EnrichmentService(adapters, options);
}

export function evaluateEnrichmentFreshness(
  freshness: EnrichmentFreshness,
  now: Date = new Date(),
): EnrichmentFreshness {
  const reprocessAt = Date.parse(freshness.reprocessAfter);
  if (!Number.isFinite(reprocessAt)) {
    return {
      ...freshness,
      status: "unknown",
      reprocessEligible: false,
    };
  }

  const reprocessEligible = now.getTime() >= reprocessAt;
  return {
    ...freshness,
    status: reprocessEligible ? "stale" : "fresh",
    reprocessEligible,
  };
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

function uniqueAdapterOutcomes(values: EnrichmentAdapterOutcome[]): EnrichmentAdapterOutcome[] {
  const seen = new Set<string>();
  const unique: EnrichmentAdapterOutcome[] = [];

  for (const value of values) {
    const key = `${value.adapterId}:${value.stage}:${value.status}:${value.message}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(value);
  }

  return unique;
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

function uniqueExternalResults(values: ExternalEnrichmentResult[]): ExternalEnrichmentResult[] {
  const seen = new Set<string>();
  const unique: ExternalEnrichmentResult[] = [];

  for (const value of values) {
    const key = `${value.adapterId}:${value.provider}:${value.status}:${value.normalizedAddress ?? ""}:${value.latitude ?? ""}:${
      value.longitude ?? ""
    }`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(value);
  }

  return unique;
}

function adapterStage(adapterId: EnrichmentAdapterId): EnrichmentAdapterStage {
  return adapterId === "source_field_inference" ? "internal" : "external";
}

function adapterOutcomeStatus(result: EnrichmentAdapterResult): EnrichmentAdapterOutcome["status"] {
  const externalStatuses = result.externalResults?.map((externalResult) => externalResult.status) ?? [];
  if (externalStatuses.includes("failed") || externalStatuses.includes("timeout")) {
    return "failed";
  }

  if (externalStatuses.includes("no_match")) {
    return "partial";
  }

  if (externalStatuses.length > 0 && externalStatuses.every((status) => status === "skipped")) {
    return "skipped";
  }

  if (externalStatuses.includes("matched")) {
    return "success";
  }

  return "success";
}

function adapterOutcomeMessage(result: EnrichmentAdapterResult): string {
  const externalStatus = result.externalResults?.[0]?.status;
  if (externalStatus === "matched") {
    return "Adapter completed with an external match.";
  }

  if (externalStatus === "no_match") {
    return "Adapter completed with weak or partial external enrichment.";
  }

  if (externalStatus === "timeout" || externalStatus === "failed") {
    return "Adapter failed safely and scoring continued.";
  }

  if (externalStatus === "skipped") {
    return "Adapter skipped enrichment deliberately.";
  }

  return "Adapter completed successfully.";
}

function buildFreshness(input: {
  enrichedAt: Date;
  freshnessWindowDays: number;
  sourceVersion: string;
}): EnrichmentFreshness {
  const staleAt = addDays(input.enrichedAt, input.freshnessWindowDays);
  return {
    status: "fresh",
    enrichedAt: input.enrichedAt.toISOString(),
    staleAt: staleAt.toISOString(),
    reprocessAfter: staleAt.toISOString(),
    reprocessEligible: false,
    sourceVersion: input.sourceVersion,
  };
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + Math.max(1, days));
  return next;
}

function safeSourceVersionSegment(value: string): string {
  return value.trim().replaceAll(/[^a-zA-Z0-9_.-]+/g, "_").slice(0, 60) || "unknown";
}
