import type {
  ApprovalRequestListResponse,
  ComparisonItemResponse,
  DatasetDetailResponse,
  DecisionBriefApprovalSummary,
  DecisionBriefDiscussionSummary,
  DecisionBriefHistorySummary,
  DecisionBriefPolicySummary,
  DecisionBriefReadinessStatus,
  DecisionBriefResponse,
  DecisionBriefSummary,
  DecisionBriefTargetEntityType,
  DecisionOutcomeStateResponse,
  DecisionHistoryListResponse,
  ReviewChecklistStateResponse,
  WorkspaceAssignmentDetailResponse,
  WorkspaceCommentListResponse,
  WorkspacePolicyEvaluation,
  WorkspacePolicyUnmetRequirement,
} from "@tax-lien/types";
import type { ApprovalService } from "../approvals/approval-service.js";
import type { ComparisonService } from "../comparison/comparison-service.js";
import type { DatasetService } from "../datasets/dataset-service.js";
import type { DecisionOutcomeService } from "../decision-outcomes/decision-outcome-service.js";
import { ApiError } from "../errors/api-error.js";
import type { ReviewChecklistService } from "../review-checklists/review-checklist-service.js";
import type { WorkspaceAssignmentService } from "../workspace-assignments/workspace-assignment-service.js";
import type { WorkspaceCommentService } from "../workspace-comments/workspace-comment-service.js";
import type { WorkspacePolicyService } from "../workspace-policies/workspace-policy-service.js";
import type { WorkspaceAccessContext } from "../workspaces/workspace-service.js";

const recentEvidenceLimit = 5;

export interface DecisionBriefActor {
  userId: string;
  email: string;
}

export class DecisionBriefService {
  public constructor(
    private readonly comparisonService: Pick<ComparisonService, "getItem" | "listHistory">,
    private readonly datasetService: Pick<DatasetService, "getDatasetForUser">,
    private readonly assignmentService: Pick<WorkspaceAssignmentService, "get">,
    private readonly checklistService: Pick<ReviewChecklistService, "getState">,
    private readonly approvalService: Pick<ApprovalService, "list">,
    private readonly commentService: Pick<WorkspaceCommentService, "list">,
    private readonly policyService: Pick<WorkspacePolicyService, "evaluateComparisonAction">,
    private readonly outcomeService: Pick<DecisionOutcomeService, "getState">,
  ) {}

  public async getBrief(
    context: WorkspaceAccessContext,
    actor: DecisionBriefActor,
    entityType: DecisionBriefTargetEntityType,
    entityId: string,
  ): Promise<DecisionBriefResponse> {
    switch (entityType) {
      case "comparison_item":
        return this.getComparisonBrief(context, actor, entityId);
    }
  }

  private async getComparisonBrief(
    context: WorkspaceAccessContext,
    actor: DecisionBriefActor,
    comparisonItemId: string,
  ): Promise<DecisionBriefResponse> {
    const target = await this.comparisonService.getItem(context.tenantUserId, comparisonItemId);
    const [
      dataset,
      assignment,
      checklist,
      approvals,
      history,
      discussion,
      policyEvaluations,
      outcome,
    ] = await Promise.all([
      this.getDatasetSafely(target.datasetId, context.tenantUserId),
      this.assignmentService.get(context, "comparison_item", target.id),
      this.checklistService.getState(context, "comparison_item", target.id),
      this.approvalService.list(context, actor.userId, {
        targetEntityType: "comparison_item",
        targetEntityId: target.id,
      }),
      this.comparisonService.listHistory(context.tenantUserId, target.id),
      this.commentService.list(
        {
          workspaceId: context.workspaceId,
          tenantUserId: context.tenantUserId,
          actorUserId: actor.userId,
        },
        "comparison_item",
        target.id,
      ),
      Promise.all([
        this.policyService.evaluateComparisonAction(
          context,
          "comparison_handoff_to_watchlist",
          target.id,
        ),
        this.policyService.evaluateComparisonAction(
          context,
          "comparison_handoff_to_portfolio",
          target.id,
        ),
      ]),
      this.outcomeService.getState(context, "comparison_item", target.id),
    ]);

    const approvalSummary = buildApprovalSummary(approvals);
    const policySummary = buildPolicySummary(policyEvaluations);
    const summary = buildSummary(target, checklist, policySummary, approvalSummary, outcome);
    const historySummary = buildHistorySummary(history);
    const discussionSummary = buildDiscussionSummary(discussion);

    return {
      workspaceId: context.workspaceId,
      generatedAt: new Date().toISOString(),
      targetEntityType: "comparison_item",
      targetEntityId: target.id,
      summary,
      target,
      ...(dataset ? { dataset } : {}),
      outcome,
      assignment: assignment.assignment,
      checklist,
      approvals: approvalSummary,
      policy: policySummary,
      history: historySummary,
      discussion: discussionSummary,
      exportText: buildExportText({
        workspaceName: context.workspaceName,
        target,
        ...(dataset ? { dataset } : {}),
        summary,
        outcome,
        assignment,
        checklist,
        approvals: approvalSummary,
        policy: policySummary,
        history: historySummary,
        discussion: discussionSummary,
      }),
    };
  }

  private async getDatasetSafely(
    datasetId: string,
    tenantUserId: string,
  ): Promise<DatasetDetailResponse["dataset"] | undefined> {
    try {
      return (await this.datasetService.getDatasetForUser(datasetId, tenantUserId)).dataset;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  }
}

function buildApprovalSummary(approvals: ApprovalRequestListResponse): DecisionBriefApprovalSummary {
  const recent = [...approvals.approvals]
    .sort((left, right) => timestamp(right.updatedAt) - timestamp(left.updatedAt))
    .slice(0, recentEvidenceLimit);
  const latest = recent[0];
  return {
    pendingCount: approvals.approvals.filter((approval) => approval.status === "pending").length,
    ...(latest ? { latest } : {}),
    recent,
  };
}

function buildPolicySummary(evaluations: WorkspacePolicyEvaluation[]): DecisionBriefPolicySummary {
  const unmetByKey = new Map<string, WorkspacePolicyUnmetRequirement>();
  for (const evaluation of evaluations) {
    for (const requirement of evaluation.unmetRequirements) {
      unmetByKey.set(`${requirement.code}:${requirement.message}`, requirement);
    }
  }
  return {
    blocked: evaluations.some((evaluation) => !evaluation.allowed),
    evaluations,
    unmetRequirements: [...unmetByKey.values()],
  };
}

function buildHistorySummary(history: DecisionHistoryListResponse): DecisionBriefHistorySummary {
  const events = [...history.events]
    .sort((left, right) => timestamp(right.createdAt) - timestamp(left.createdAt))
    .slice(0, recentEvidenceLimit);
  return {
    totalEvents: history.events.length,
    events,
  };
}

function buildDiscussionSummary(discussion: WorkspaceCommentListResponse): DecisionBriefDiscussionSummary {
  const comments = [...discussion.comments]
    .sort((left, right) => timestamp(right.createdAt) - timestamp(left.createdAt))
    .slice(0, recentEvidenceLimit);
  return {
    totalComments: discussion.comments.length,
    comments,
    attention: discussion.attention,
  };
}

function buildSummary(
  target: ComparisonItemResponse,
  checklist: ReviewChecklistStateResponse,
  policy: DecisionBriefPolicySummary,
  approvals: DecisionBriefApprovalSummary,
  outcome: DecisionOutcomeStateResponse,
): DecisionBriefSummary {
  const readinessStatus = briefReadinessStatus(checklist, policy, outcome);
  return {
    title: comparisonTitle(target),
    subtitle: `Comparison item from row ${target.sourceRowNumber}`,
    readinessStatus,
    decision: target.decision,
    ...(target.note ? { currentNote: target.note } : {}),
    nextAction: nextActionFor(readinessStatus, approvals, policy, outcome),
  };
}

function briefReadinessStatus(
  checklist: ReviewChecklistStateResponse,
  policy: DecisionBriefPolicySummary,
  outcome: DecisionOutcomeStateResponse,
): DecisionBriefReadinessStatus {
  if (outcome.resolved) {
    return "resolved";
  }
  if (policy.blocked) {
    return "blocked";
  }
  if (checklist.progress.status === "not_configured") {
    return "not_configured";
  }
  if (checklist.progress.allRequiredComplete) {
    return "ready";
  }
  return "needs_review";
}

function nextActionFor(
  readinessStatus: DecisionBriefReadinessStatus,
  approvals: DecisionBriefApprovalSummary,
  policy: DecisionBriefPolicySummary,
  outcome: DecisionOutcomeStateResponse,
): string {
  if (outcome.outcome) {
    return `Resolved as ${outcome.outcome.status} by ${outcome.outcome.resolver.email}.`;
  }
  if (approvals.pendingCount > 0) {
    return "Resolve the pending approval request before treating the move-forward action as accepted.";
  }
  if (policy.unmetRequirements.length > 0) {
    return policy.unmetRequirements[0]?.resolution ?? "Resolve unmet workspace policy requirements.";
  }
  if (readinessStatus === "not_configured") {
    return "Configure a review checklist if this item needs repeatable evidence gates.";
  }
  if (readinessStatus === "needs_review") {
    return "Complete remaining required review checklist items.";
  }
  return "Review the evidence pack and continue through the normal approval or handoff surface.";
}

function comparisonTitle(target: ComparisonItemResponse): string {
  return (
    target.normalizedFields.parcelId ??
    target.normalizedFields.address ??
    `Comparison ${target.id.slice(-6)}`
  );
}

function buildExportText(input: {
  workspaceName: string;
  target: ComparisonItemResponse;
  dataset?: DatasetDetailResponse["dataset"];
  summary: DecisionBriefSummary;
  outcome: DecisionOutcomeStateResponse;
  assignment: WorkspaceAssignmentDetailResponse;
  checklist: ReviewChecklistStateResponse;
  approvals: DecisionBriefApprovalSummary;
  policy: DecisionBriefPolicySummary;
  history: DecisionBriefHistorySummary;
  discussion: DecisionBriefDiscussionSummary;
}): string {
  const lines = [
    `Decision Brief: ${input.summary.title}`,
    `Workspace: ${input.workspaceName}`,
    `Target: comparison_item/${input.target.id}`,
    `Readiness: ${input.summary.readinessStatus}`,
    `Decision: ${input.target.decision}`,
    input.outcome.outcome
      ? `Final outcome: ${input.outcome.outcome.status} by ${input.outcome.outcome.resolver.email} at ${input.outcome.outcome.resolvedAt}`
      : "Final outcome: active review",
    `Next action: ${input.summary.nextAction}`,
    "",
    "Score and Risk",
    `Investment score: ${input.target.investmentScore}`,
    `Risk score: ${input.target.riskScore}`,
    `Liquidity score: ${input.target.liquidityScore}`,
    `Redemption probability: ${input.target.redemptionProbability}`,
    `Confidence score: ${input.target.confidenceScore}`,
    ...(input.target.valueCoverageRatio !== undefined
      ? [`Value coverage ratio: ${input.target.valueCoverageRatio}`]
      : []),
    "",
    "Dataset and Import",
    input.dataset
      ? `Dataset: ${input.dataset.sourceLabel ?? input.dataset.originalFilename} (${input.dataset.readinessSummary.status})`
      : "Dataset: unavailable or no longer accessible",
    "",
    "Assignment",
    input.assignment.assignment
      ? `Assigned to: ${input.assignment.assignment.assignee.email}`
      : "Assigned to: unassigned",
    "",
    "Checklist",
    `Checklist status: ${input.checklist.progress.status}`,
    `Required complete: ${input.checklist.progress.completedRequiredItems}/${input.checklist.progress.requiredItems}`,
    "",
    "Approvals",
    `Pending approvals: ${input.approvals.pendingCount}`,
    ...(input.approvals.latest
      ? [`Latest approval: ${input.approvals.latest.status} by ${input.approvals.latest.requester.email}`]
      : ["Latest approval: none"]),
    "",
    "Workspace Policy",
    input.policy.blocked ? "Policy readiness: blocked" : "Policy readiness: no blocking requirements",
    ...input.policy.unmetRequirements.map((requirement) => `- ${requirement.message} ${requirement.resolution}`),
    "",
    "Flags",
    ...(input.target.flags.length > 0 ? input.target.flags.map((flag) => `- ${flag}`) : ["None"]),
    "",
    "Reasoning",
    ...(input.target.reasoning.length > 0
      ? input.target.reasoning.map((reason) => `- ${reason}`)
      : ["None"]),
    "",
    "Recent Decision History",
    ...(input.history.events.length > 0
      ? input.history.events.map((event) => `- ${event.eventType} at ${event.createdAt}`)
      : ["No decision history yet."]),
    "",
    "Latest Discussion",
    ...(input.discussion.comments.length > 0
      ? input.discussion.comments.map((comment) => `- ${comment.author.email}: ${comment.body}`)
      : ["No discussion yet."]),
  ];

  return lines.join("\n");
}

function timestamp(value: string): number {
  return new Date(value).getTime();
}
