import type {
  AuthenticatedPrincipal,
  DatasetResponse,
  DecisionBriefResponse,
  IntelligenceEvaluationResponse,
  NormalizedScoredRecordFields,
  ScoredRecordResponse,
} from "@tax-lien/types";
import type { DatasetService } from "../datasets/dataset-service.js";
import type { DecisionBriefService } from "../decision-briefs/decision-brief-service.js";
import type { ScoringService } from "../scoring/scoring-service.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";

export const MCP_TOOL_CONTRACT_VERSION = "1.0.0" as const;

interface SourceCitation {
  citationId: string;
  sourceType: "user_upload";
  authority: string;
  uri: string;
  retrievedAt: string;
  datasetId: string;
  sourceRowNumber: number;
  originalFilename: string;
  sourceLabel?: string;
  appUrl?: string;
  limitation: string;
}

interface StoredFact {
  field: keyof NormalizedScoredRecordFields;
  value: string | number;
  state: "stored_normalized_value";
  verification: "unverified_user_upload";
  citationIds: string[];
}

export interface McpEvidenceServiceContract {
  listWorkspaces(principal: AuthenticatedPrincipal): Promise<Record<string, unknown>>;
  listDatasets(principal: AuthenticatedPrincipal, workspaceId: string): Promise<Record<string, unknown>>;
  listDatasetCandidates(
    principal: AuthenticatedPrincipal,
    workspaceId: string,
    datasetId: string,
    offset: number,
    limit: number,
  ): Promise<Record<string, unknown>>;
  getCandidateEvidence(
    principal: AuthenticatedPrincipal,
    workspaceId: string,
    candidateId: string,
  ): Promise<Record<string, unknown>>;
  compareCandidates(
    principal: AuthenticatedPrincipal,
    workspaceId: string,
    candidateIds: string[],
  ): Promise<Record<string, unknown>>;
  getDecisionBrief(
    principal: AuthenticatedPrincipal,
    workspaceId: string,
    comparisonItemId: string,
  ): Promise<Record<string, unknown>>;
}

export class PlatformMcpEvidenceService implements McpEvidenceServiceContract {
  public constructor(
    private readonly workspaceService: Pick<WorkspaceService, "listWorkspaces" | "resolveContext">,
    private readonly datasetService: Pick<DatasetService, "listDatasets" | "getDatasetForUser">,
    private readonly scoringService: Pick<ScoringService, "listScores" | "getScore">,
    private readonly decisionBriefService: Pick<DecisionBriefService, "getBrief">,
    private readonly appBaseUrl?: string,
  ) {}

  public async listWorkspaces(principal: AuthenticatedPrincipal): Promise<Record<string, unknown>> {
    const response = await this.workspaceService.listWorkspaces(principal.userId);
    return {
      currentWorkspaceId: response.currentWorkspaceId,
      workspaces: response.workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        role: workspace.role,
        isDefault: workspace.isDefault,
        permissions: {
          canReadSharedData: workspace.permissions.canReadSharedData,
        },
      })),
    };
  }

  public async listDatasets(
    principal: AuthenticatedPrincipal,
    workspaceId: string,
  ): Promise<Record<string, unknown>> {
    const context = await this.workspaceService.resolveContext(principal.userId, workspaceId);
    const response = await this.datasetService.listDatasets(context.tenantUserId);
    return {
      workspace: workspaceSummary(context),
      datasets: response.datasets.map((dataset) => datasetSummary(dataset, this.appBaseUrl)),
    };
  }

  public async listDatasetCandidates(
    principal: AuthenticatedPrincipal,
    workspaceId: string,
    datasetId: string,
    offset: number,
    limit: number,
  ): Promise<Record<string, unknown>> {
    const context = await this.workspaceService.resolveContext(principal.userId, workspaceId);
    const dataset = (await this.datasetService.getDatasetForUser(datasetId, context.tenantUserId)).dataset;
    const scores = (await this.scoringService.listScores(datasetId, context.tenantUserId)).scores;
    const page = scores.slice(offset, offset + limit);
    return {
      workspace: workspaceSummary(context),
      dataset: datasetSummary(dataset, this.appBaseUrl),
      pagination: {
        offset,
        limit,
        returned: page.length,
        total: scores.length,
        hasMore: offset + page.length < scores.length,
        ...(offset + page.length < scores.length ? { nextOffset: offset + page.length } : {}),
      },
      candidates: page.map((record) => candidateEvidence(record, dataset, this.appBaseUrl, false)),
      safetyNotice:
        "Candidates are not ranked by this tool. Legacy values are fixed-rule heuristics, not validated predictions or bidding instructions.",
    };
  }

  public async getCandidateEvidence(
    principal: AuthenticatedPrincipal,
    workspaceId: string,
    candidateId: string,
  ): Promise<Record<string, unknown>> {
    const context = await this.workspaceService.resolveContext(principal.userId, workspaceId);
    const record = await this.scoringService.getScore(candidateId, context.tenantUserId);
    const dataset = (await this.datasetService.getDatasetForUser(record.datasetId, context.tenantUserId)).dataset;
    return {
      workspace: workspaceSummary(context),
      candidate: candidateEvidence(record, dataset, this.appBaseUrl, true),
      safetyNotice:
        "This is decision support from stored evidence. Verify the issuing authority, current lien status, redemption rules, title, and auction terms before acting.",
    };
  }

  public async compareCandidates(
    principal: AuthenticatedPrincipal,
    workspaceId: string,
    candidateIds: string[],
  ): Promise<Record<string, unknown>> {
    const context = await this.workspaceService.resolveContext(principal.userId, workspaceId);
    const records = await Promise.all(
      candidateIds.map((candidateId) => this.scoringService.getScore(candidateId, context.tenantUserId)),
    );
    const datasets = new Map<string, DatasetResponse>();
    for (const datasetId of new Set(records.map((record) => record.datasetId))) {
      datasets.set(
        datasetId,
        (await this.datasetService.getDatasetForUser(datasetId, context.tenantUserId)).dataset,
      );
    }
    return {
      workspace: workspaceSummary(context),
      candidates: records.map((record) =>
        candidateEvidence(record, datasets.get(record.datasetId)!, this.appBaseUrl, true),
      ),
      comparisonPolicy: {
        rankingPerformed: false,
        recommendationProduced: false,
        instruction:
          "Compare only the cited values, engine applicability, limitations, and unknowns. Do not convert legacy heuristics into probabilities or bid advice.",
      },
    };
  }

  public async getDecisionBrief(
    principal: AuthenticatedPrincipal,
    workspaceId: string,
    comparisonItemId: string,
  ): Promise<Record<string, unknown>> {
    const context = await this.workspaceService.resolveContext(principal.userId, workspaceId);
    const brief = await this.decisionBriefService.getBrief(
      context,
      principal,
      "comparison_item",
      comparisonItemId,
    );
    const record = await this.scoringService.getScore(brief.target.scoredRecordId, context.tenantUserId);
    const dataset = (await this.datasetService.getDatasetForUser(record.datasetId, context.tenantUserId)).dataset;
    return {
      workspace: workspaceSummary(context),
      generatedAt: brief.generatedAt,
      summary: {
        title: brief.summary.title,
        subtitle: brief.summary.subtitle,
        readinessStatus: brief.summary.readinessStatus,
        ...(brief.summary.decision ? { decision: brief.summary.decision } : {}),
        nextAction: brief.summary.nextAction,
      },
      candidate: candidateEvidence(record, dataset, this.appBaseUrl, true),
      workflowEvidence: safeWorkflowEvidence(brief),
      memoOutline: [
        "Decision question and current workflow status",
        "Cited stored facts",
        "Versioned engine output and applicability",
        "Legacy fixed-rule heuristics, clearly labeled",
        "Unknowns and required verification",
        "Policy gates and unresolved workflow items",
      ],
      draftingConstraint:
        "A memo must preserve source qualifications and unknowns. It must not claim a probability, legal conclusion, title condition, auction eligibility, or bid recommendation that is absent from cited evidence.",
    };
  }
}

function workspaceSummary(context: {
  workspaceId: string;
  workspaceName: string;
  role: string;
}): Record<string, string> {
  return { id: context.workspaceId, name: context.workspaceName, role: context.role };
}

function datasetSummary(dataset: DatasetResponse, appBaseUrl?: string): Record<string, unknown> {
  return {
    id: dataset.id,
    originalFilename: dataset.originalFilename,
    sourceType: dataset.sourceType,
    ...(dataset.sourceLabel ? { sourceLabel: dataset.sourceLabel } : {}),
    uploadedAt: dataset.uploadedAt,
    rowCount: dataset.rowCount,
    status: dataset.status,
    readiness: {
      status: dataset.readinessSummary.status,
      score: dataset.readinessSummary.score,
      scoringRecommended: dataset.readinessSummary.scoringRecommended,
      issues: dataset.readinessSummary.issues.map((issue) => ({
        severity: issue.severity,
        message: issue.message,
        ...(issue.field ? { field: issue.field } : {}),
      })),
      guidance: dataset.readinessSummary.guidance,
    },
    ...(appBaseUrl ? { appUrl: `${trimTrailingSlash(appBaseUrl)}/#/datasets/${dataset.id}` } : {}),
  };
}

function candidateEvidence(
  record: ScoredRecordResponse,
  dataset: DatasetResponse,
  appBaseUrl: string | undefined,
  includeEngineDetail: boolean,
): Record<string, unknown> {
  const citation = sourceCitation(record, dataset, appBaseUrl);
  const intelligence = intelligenceSummary(record.intelligence, includeEngineDetail);
  return {
    candidateId: record.id,
    datasetId: record.datasetId,
    sourceRowNumber: record.sourceRowNumber,
    facts: storedFacts(record.normalizedFields, citation.citationId),
    inferences: {
      normalizedFieldInferences: {
        propertyTypeCategory: record.normalizedFields.propertyTypeCategory,
        explanation: "Category assigned by the normalization pipeline, not an independently observed county fact.",
      },
      legacyFixedRuleHeuristics: {
        methodology: record.legacyScoring?.methodology ?? "fixed_rule_heuristic",
        packageVersion: record.legacyScoring?.packageVersion ?? "historical_or_unknown",
        investmentScore: record.investmentScore,
        riskScore: record.riskScore,
        liquidityScore: record.liquidityScore,
        redemptionHeuristicSignal: record.redemptionProbability,
        redemptionSignalKind: "heuristic_not_probability",
        confidenceScore: record.confidenceScore,
        ...(record.valueCoverageRatio !== undefined
          ? { valueCoverageRatio: record.valueCoverageRatio }
          : {}),
        flags: record.flags,
        reasoning: record.reasoning,
      },
    },
    versionedIntelligence: intelligence,
    unknowns: candidateUnknowns(record),
    citations: [citation],
    scoredAt: record.scoredAt,
  };
}

function storedFacts(fields: NormalizedScoredRecordFields, citationId: string): StoredFact[] {
  const facts: StoredFact[] = [];
  for (const field of [
    "parcelId",
    "lienAmount",
    "estimatedValue",
    "propertyType",
    "address",
  ] as const) {
    const value = fields[field];
    if (value !== undefined) {
      facts.push({
        field,
        value,
        state: "stored_normalized_value",
        verification: "unverified_user_upload",
        citationIds: [citationId],
      });
    }
  }
  return facts;
}

function sourceCitation(
  record: ScoredRecordResponse,
  dataset: DatasetResponse,
  appBaseUrl?: string,
): SourceCitation {
  return {
    citationId: `user-upload:${dataset.id}:${record.sourceRowNumber}`,
    sourceType: "user_upload",
    authority: dataset.sourceLabel?.trim()
      ? `User-provided source label: ${dataset.sourceLabel.trim()}`
      : `User-uploaded file: ${dataset.originalFilename}`,
    uri: `urn:tax-lien:dataset:${dataset.id}:row:${record.sourceRowNumber}`,
    retrievedAt: dataset.uploadedAt,
    datasetId: dataset.id,
    sourceRowNumber: record.sourceRowNumber,
    originalFilename: dataset.originalFilename,
    ...(dataset.sourceLabel ? { sourceLabel: dataset.sourceLabel } : {}),
    ...(appBaseUrl ? { appUrl: `${trimTrailingSlash(appBaseUrl)}/#/datasets/${dataset.id}` } : {}),
    limitation: "User-uploaded evidence is not independently verified against the issuing authority.",
  };
}

function intelligenceSummary(
  intelligence: IntelligenceEvaluationResponse | undefined,
  includeDetail: boolean,
): Record<string, unknown> {
  if (!intelligence) {
    return {
      state: "not_configured",
      message: "No versioned intelligence evaluation is stored for this historical score.",
    };
  }
  if (intelligence.state !== "completed") {
    return {
      state: intelligence.state,
      message: intelligence.message,
      ...(intelligence.attemptedAt ? { attemptedAt: intelligence.attemptedAt } : {}),
      ...(intelligence.state === "failed" ? { failureCode: intelligence.failureCode } : {}),
    };
  }
  const result = intelligence.result;
  return {
    state: intelligence.state,
    message: intelligence.message,
    ...(intelligence.attemptedAt ? { attemptedAt: intelligence.attemptedAt } : {}),
    status: result.status,
    applicability: result.applicability,
    versions: result.versions,
    contractVersion: result.contractVersion,
    evidenceSchemaVersion: result.evidenceSchemaVersion,
    evidenceDigest: result.evidenceDigest,
    missingEvidence: result.missingEvidence,
    limitations: result.limitations,
    ...(includeDetail ? { signals: result.signals, findings: result.findings } : {}),
  };
}

function candidateUnknowns(record: ScoredRecordResponse): string[] {
  const unknowns = new Set<string>([
    "Issuing jurisdiction is not verified from current upload metadata.",
    "Current lien status, redemption events, title condition, and auction eligibility are not independently verified.",
  ]);
  for (const [field, value] of Object.entries({
    parcelId: record.normalizedFields.parcelId,
    lienAmount: record.normalizedFields.lienAmount,
    estimatedValue: record.normalizedFields.estimatedValue,
    propertyType: record.normalizedFields.propertyType,
    address: record.normalizedFields.address,
  })) {
    if (value === undefined) {
      unknowns.add(`${field} is missing from stored normalized evidence.`);
    }
  }
  const intelligence = record.intelligence;
  if (!intelligence || intelligence.state === "not_configured") {
    unknowns.add("Versioned intelligence was not configured when this candidate was scored.");
  } else if (intelligence.state === "failed") {
    unknowns.add(`Versioned intelligence failed: ${intelligence.failureCode}.`);
  } else {
    for (const missing of intelligence.result.missingEvidence) {
      unknowns.add(missing);
    }
    for (const signal of intelligence.result.signals) {
      if (signal.status !== "available") {
        for (const missing of signal.missingEvidence) {
          unknowns.add(missing);
        }
      }
    }
  }
  return [...unknowns];
}

function safeWorkflowEvidence(brief: DecisionBriefResponse): Record<string, unknown> {
  return {
    outcome: {
      resolved: brief.outcome.resolved,
      ...(brief.outcome.outcome
        ? {
            status: brief.outcome.outcome.status,
            resolvedAt: brief.outcome.outcome.resolvedAt,
          }
        : {}),
    },
    assignment: { assigned: brief.assignment !== null },
    checklist: brief.checklist.progress,
    approvals: {
      pendingCount: brief.approvals.pendingCount,
      recentStatuses: brief.approvals.recent.map((approval) => ({
        id: approval.id,
        requestedAction: approval.requestedAction,
        status: approval.status,
        updatedAt: approval.updatedAt,
      })),
    },
    policy: {
      blocked: brief.policy.blocked,
      unmetRequirements: brief.policy.unmetRequirements,
    },
    history: { totalEvents: brief.history.totalEvents },
    discussion: {
      totalComments: brief.discussion.totalComments,
      attention: brief.discussion.attention,
    },
  };
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}
