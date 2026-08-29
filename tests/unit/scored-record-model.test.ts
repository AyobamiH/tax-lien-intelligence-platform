import { describe, expect, it } from "vitest";
import { ScoredRecordModel } from "../../packages/db/src/index.js";
import type { EngineResultV1 } from "../../packages/engine-contract/src/index.js";

function engineResult(): EngineResultV1 {
  return {
    contractVersion: "1.1.0",
    evidenceSchemaVersion: "1.1.0",
    requestId: "request-model-001",
    candidateId: "candidate-model-001",
    generatedAt: "2026-08-29T12:05:00.000Z",
    status: "insufficient_evidence",
    versions: {
      engineVersion: "jurisdiction-rules-1.1.0",
      rulePackVersion: "2026-08-29.2",
      evidenceVersion: "model-evidence-v1",
    },
    applicability: {
      status: "applicable",
      jurisdiction: "US/AZ/Maricopa",
      reason: "The verified Maricopa rule pack applies.",
      sourceRefs: ["upload-1"],
      rulePackId: "us-az-maricopa-tax-lien-v1",
    },
    evidenceDigest: "b".repeat(64),
    signals: [
      {
        key: "redemption_probability",
        status: "unavailable",
        method: "not_computed",
        unit: "probability",
        evidenceRefs: [],
        explanation: "No validated outcome model is installed.",
        missingEvidence: ["verified historical redemption outcomes"],
      },
    ],
    findings: [],
    missingEvidence: ["verified historical redemption outcomes"],
    limitations: ["No probability was computed."],
  };
}

function scoredRecord(intelligence: Record<string, unknown>) {
  return new ScoredRecordModel({
    userId: "user-1",
    datasetId: "dataset-1",
    sourceRowNumber: 1,
    normalizedFields: { propertyTypeCategory: "unknown" },
    intelligence,
    score: {
      investmentScore: 40,
      riskScore: 60,
      liquidityScore: 30,
      redemptionProbability: 0.4,
      confidenceScore: 25,
      flags: [],
      reasoning: [],
    },
    scoredAt: new Date("2026-08-29T12:05:00.000Z"),
  });
}

describe("scored record intelligence persistence contract", () => {
  it("accepts a completed evaluation only with a contract-valid versioned result", async () => {
    const document = scoredRecord({
      state: "completed",
      message: "Versioned intelligence requires additional evidence.",
      attemptedAt: new Date("2026-08-29T12:05:00.000Z"),
      result: engineResult(),
    });

    await expect(document.validate()).resolves.toBeUndefined();
  });

  it("rejects completed state without a result and failed state with a stale result", async () => {
    const missing = scoredRecord({
      state: "completed",
      message: "Incorrect completed state.",
    });
    const stale = scoredRecord({
      state: "failed",
      failureCode: "service_unavailable",
      message: "Service was unavailable.",
      result: engineResult(),
    });

    await expect(missing.validate()).rejects.toThrow(
      "Stored intelligence state, result, and failure code are inconsistent.",
    );
    await expect(stale.validate()).rejects.toThrow(
      "Stored intelligence state, result, and failure code are inconsistent.",
    );
  });
});
