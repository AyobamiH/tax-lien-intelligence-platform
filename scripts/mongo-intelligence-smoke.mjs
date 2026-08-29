#!/usr/bin/env node
import {
  ScoredRecordModel,
  connectMongo,
  disconnectMongo,
} from "@tax-lien/db";
import { validateEngineResultV1 } from "@tax-lien/engine-contract";
import { evaluateJurisdictionRules } from "@tax-lien/jurisdiction-rules";
import { buildCandidateEvidence } from "../apps/api/dist/intelligence/candidate-evidence.js";
import { MongoScoredRecordStore } from "../apps/api/dist/scoring/scored-record-store.js";

const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/tax_lien_platform";
const smokeDbName =
  process.env.MONGO_INTELLIGENCE_SMOKE_DB_NAME ??
  `tax_lien_intelligence_smoke_${process.pid}_${Date.now()}`;
const evaluatedAt = new Date("2026-08-29T12:05:00.000Z");
const userId = "mongo-intelligence-smoke-user";
const datasetId = "mongo-intelligence-smoke-dataset";

async function main() {
  await connectMongo({
    uri: mongoUri,
    dbName: smokeDbName,
    serverSelectionTimeoutMs: 10_000,
  });

  try {
    const store = new MongoScoredRecordStore();
    const evidence = buildCandidateEvidence({
      datasetId,
      sourceRowNumber: 1,
      sourceAuthority: "Mongo intelligence smoke upload",
      jurisdiction: { country: "unknown", state: "unknown", county: "unknown" },
      sourceObservedAt: new Date("2026-08-29T12:00:00.000Z"),
      evaluationRequestedAt: evaluatedAt,
      scoreableRecord: scoreableRecord(),
      enrichment: enrichment(),
    });
    const outcome = evaluateJurisdictionRules(evidence, {
      generatedAt: evaluatedAt.toISOString(),
    });
    if (!outcome.ok) {
      throw new Error(`rule evaluation failed: ${outcome.errors.join("; ")}`);
    }

    await store.replaceScoresForDataset(userId, datasetId, [
      recordInput({
        state: "completed",
        message: "Versioned deterministic intelligence is available.",
        attemptedAt: evaluatedAt.toISOString(),
        result: outcome.result,
      }),
    ]);

    const completed = await store.listScoresForDataset(userId, datasetId);
    assertEqual(completed.length, 1, "completed record count");
    assertEqual(completed[0]?.intelligence?.state, "completed", "completed intelligence state");
    assertEqual(
      completed[0]?.intelligence?.result?.evidenceDigest,
      outcome.result.evidenceDigest,
      "persisted evidence digest",
    );
    const validation = validateEngineResultV1(completed[0]?.intelligence?.result);
    assertEqual(validation.valid, true, `persisted result validation: ${validation.errors.join("; ")}`);

    await store.replaceScoresForDataset(userId, datasetId, [
      recordInput({
        state: "failed",
        failureCode: "service_unavailable",
        message: "Versioned intelligence could not be reached for this scoring run.",
        attemptedAt: new Date("2026-08-29T12:10:00.000Z").toISOString(),
      }),
    ]);

    const failed = await store.listScoresForDataset(userId, datasetId);
    assertEqual(failed[0]?.intelligence?.state, "failed", "failed intelligence state");
    assertEqual(
      failed[0]?.intelligence?.failureCode,
      "service_unavailable",
      "failed intelligence code",
    );
    assertEqual(failed[0]?.intelligence?.result, undefined, "mapped stale result removal");

    const raw = await ScoredRecordModel.findOne({ userId, datasetId }).lean().exec();
    assertEqual(raw?.intelligence?.result, undefined, "stored stale result removal");

    console.log(
      `mongo intelligence smoke passed: db=${smokeDbName} dataset=${datasetId} digest=${outcome.result.evidenceDigest}`,
    );
  } finally {
    await ScoredRecordModel.db.dropDatabase();
    await disconnectMongo();
  }
}

function recordInput(intelligence) {
  return {
    userId,
    datasetId,
    sourceRowNumber: 1,
    normalizedFields: {
      parcelId: "SMOKE-INTELLIGENCE-001",
      lienAmount: 1_000,
      estimatedValue: 12_000,
      propertyType: "Vacant land",
      propertyTypeCategory: "land",
    },
    enrichment: enrichment(),
    intelligence,
    score: {
      investmentScore: 70,
      riskScore: 30,
      liquidityScore: 45,
      redemptionProbability: 0.55,
      confidenceScore: 65,
      valueCoverageRatio: 12,
      flags: [],
      reasoning: ["Legacy fixed-rule heuristic retained for compatibility."],
    },
    scoredAt: evaluatedAt,
  };
}

function scoreableRecord() {
  return {
    parcelId: "SMOKE-INTELLIGENCE-001",
    lienAmount: 1_000,
    estimatedValue: 12_000,
    propertyType: "Vacant land",
  };
}

function enrichment() {
  return {
    adapters: ["source_field_inference"],
    orchestrationVersion: "enrichment-orchestration-v1",
    enrichedAt: "2026-08-29T12:00:00.000Z",
    adapterOutcomes: [
      {
        adapterId: "source_field_inference",
        stage: "internal",
        status: "success",
        message: "Adapter completed successfully.",
        startedAt: "2026-08-29T12:00:00.000Z",
        completedAt: "2026-08-29T12:00:00.000Z",
      },
    ],
    freshness: {
      status: "fresh",
      enrichedAt: "2026-08-29T12:00:00.000Z",
      staleAt: "2026-09-28T12:00:00.000Z",
      reprocessAfter: "2026-09-28T12:00:00.000Z",
      reprocessEligible: false,
      sourceVersion: "source_field_inference@1",
    },
    dataQualityScore: 80,
    inferredFields: {
      propertyType: "Vacant land",
      propertyTypeCategory: "land",
    },
    signals: [],
    flags: [],
    reasoning: [],
  };
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`mongo intelligence smoke failed: ${message}`);
  process.exit(1);
});
