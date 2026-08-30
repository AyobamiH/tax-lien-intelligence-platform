import {
  CANDIDATE_EVIDENCE_SCHEMA_VERSION,
  type CandidateEvidenceV1,
  type EvidenceFieldV1,
  type MoneyV1,
} from "@tax-lien/engine-contract";
import type { ScoreableRecord } from "@tax-lien/scoring";
import type { EnrichmentResult } from "@tax-lien/types";

export interface BuildCandidateEvidenceInput {
  datasetId: string;
  sourceRowNumber: number;
  sourceAuthority: string;
  jurisdiction: CandidateEvidenceV1["jurisdiction"];
  sourceObservedAt: Date;
  evaluationRequestedAt: Date;
  scoreableRecord: ScoreableRecord;
  enrichment: EnrichmentResult;
}

export function buildCandidateEvidence(input: BuildCandidateEvidenceInput): CandidateEvidenceV1 {
  const sourceId = `user-upload:${input.datasetId}:${input.sourceRowNumber}`;
  const observedAt = input.sourceObservedAt.toISOString();
  const sourceRefs = [sourceId];
  const inferred = input.enrichment.inferredFields;
  const normalizedDerivation =
    "Normalized from the user-uploaded row by the versioned import and enrichment pipeline.";

  return {
    schemaVersion: CANDIDATE_EVIDENCE_SCHEMA_VERSION,
    evidenceVersion: [
      CANDIDATE_EVIDENCE_SCHEMA_VERSION,
      input.datasetId,
      input.sourceRowNumber,
      observedAt,
      input.enrichment.freshness.sourceVersion,
    ].join(":"),
    requestId: [
      "score",
      input.datasetId,
      input.sourceRowNumber,
      input.evaluationRequestedAt.toISOString(),
    ].join(":"),
    candidateId: `${input.datasetId}:${input.sourceRowNumber}`,
    asOf: observedAt,
    jurisdiction: input.jurisdiction,
    provenance: [
      {
        sourceId,
        sourceType: "user_upload",
        authority: input.sourceAuthority,
        uri: `urn:tax-lien:dataset:${input.datasetId}:row:${input.sourceRowNumber}`,
        retrievedAt: observedAt,
        effectiveAt: observedAt,
        adapterVersion: input.enrichment.freshness.sourceVersion,
      },
    ],
    fields: {
      parcelId: stringField(
        input.scoreableRecord.parcelId,
        sourceRefs,
        observedAt,
        inferred.parcelId !== undefined,
        normalizedDerivation,
      ),
      lienAmount: moneyField(
        input.scoreableRecord.lienAmount,
        sourceRefs,
        observedAt,
        normalizedDerivation,
      ),
      estimatedValue: moneyField(
        input.scoreableRecord.estimatedValue,
        sourceRefs,
        observedAt,
        normalizedDerivation,
      ),
      propertyType: stringField(
        input.scoreableRecord.propertyType,
        sourceRefs,
        observedAt,
        inferred.propertyType !== undefined,
        normalizedDerivation,
      ),
      roadAccess: booleanField(input.scoreableRecord.roadAccess, sourceRefs, observedAt),
      buildable: booleanField(input.scoreableRecord.buildable, sourceRefs, observedAt),
      utilitiesAvailable: booleanField(
        input.scoreableRecord.utilitiesAvailable,
        sourceRefs,
        observedAt,
      ),
      locationQuality: {
        state: "unknown",
        sourceRefs,
      },
    },
    limitations: [
      "The source is a user-uploaded row and has not been independently verified against the issuing county.",
      "USD follows the platform's current legacy normalization assumption and is not independently verified from the uploaded row.",
      ...(Object.values(input.jurisdiction).includes("unknown")
        ? ["Jurisdiction remains unknown because current upload metadata does not verify the issuing authority."]
        : []),
    ],
  };
}

function stringField(
  value: string | undefined,
  sourceRefs: string[],
  observedAt: string,
  derived: boolean,
  derivation: string,
): EvidenceFieldV1<string> {
  if (value === undefined) {
    return { state: "unknown", sourceRefs };
  }
  if (derived) {
    return { state: "derived", value, sourceRefs, observedAt, derivation };
  }
  return { state: "observed", value, sourceRefs, observedAt };
}

function moneyField(
  value: number | undefined,
  sourceRefs: string[],
  observedAt: string,
  derivation: string,
): EvidenceFieldV1<MoneyV1> {
  if (value === undefined) {
    return { state: "unknown", sourceRefs };
  }
  return {
    state: "derived",
    value: { amount: value, currency: "USD" },
    sourceRefs,
    observedAt,
    derivation,
  };
}

function booleanField(
  value: boolean | undefined,
  sourceRefs: string[],
  observedAt: string,
): EvidenceFieldV1<boolean> {
  return value === undefined
    ? { state: "unknown", sourceRefs }
    : { state: "observed", value, sourceRefs, observedAt };
}
