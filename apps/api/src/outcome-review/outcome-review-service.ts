import type {
  ComparisonItemResponse,
  DecisionOutcomeStatus,
  OutcomeReviewResponse,
  OutcomeReviewResolution,
  OutcomeReviewSignal,
  OutcomeReviewSummary,
  OutcomeReviewTargetSummary,
} from "@tax-lien/types";
import type { ComparisonService } from "../comparison/comparison-service.js";
import { decisionOutcomeStatuses, toDecisionOutcomeResponse } from "../decision-outcomes/decision-outcome-service.js";
import type {
  DecisionOutcomeStore,
  StoredDecisionOutcome,
} from "../decision-outcomes/decision-outcome-store.js";
import type { WorkspaceAccessContext } from "../workspaces/workspace-service.js";

const defaultWindowDays = 30;
const millisecondsPerDay = 24 * 60 * 60 * 1000;
const maxRecentResolutions = 12;

export interface OutcomeReviewFilters {
  windowDays?: number;
}

export class OutcomeReviewService {
  public constructor(
    private readonly outcomeStore: Pick<DecisionOutcomeStore, "listForWorkspace">,
    private readonly comparisonService: Pick<ComparisonService, "listItems">,
  ) {}

  public async getReview(
    context: WorkspaceAccessContext,
    filters: OutcomeReviewFilters = {},
  ): Promise<OutcomeReviewResponse> {
    const windowDays = filters.windowDays ?? defaultWindowDays;
    const windowStart = new Date(Date.now() - windowDays * millisecondsPerDay);
    const [outcomes, comparisonResult] = await Promise.all([
      this.outcomeStore.listForWorkspace({
        workspaceId: context.workspaceId,
        targetEntityType: "comparison_item",
      }),
      this.comparisonService.listItems(context.tenantUserId),
    ]);
    const comparisonById = new Map(
      comparisonResult.items.map((item) => [item.id, item]),
    );
    const visibleOutcomes = outcomes.filter((outcome) => comparisonById.has(outcome.targetEntityId));
    const recentOutcomes = visibleOutcomes
      .filter((outcome) => outcome.resolvedAt >= windowStart)
      .slice(0, maxRecentResolutions);
    const summary = buildSummary(comparisonResult.items.length, visibleOutcomes, recentOutcomes);

    return {
      workspaceId: context.workspaceId,
      generatedAt: new Date().toISOString(),
      windowDays,
      summary,
      recentResolutions: recentOutcomes.map((outcome) =>
        toOutcomeReviewResolution(outcome, comparisonById.get(outcome.targetEntityId)),
      ),
      signals: buildSignals(summary, windowDays),
    };
  }
}

function buildSummary(
  comparisonItemCount: number,
  outcomes: StoredDecisionOutcome[],
  recentOutcomes: StoredDecisionOutcome[],
): OutcomeReviewSummary {
  const countsByStatus = decisionOutcomeStatuses.map((status) => ({
    status,
    count: countStatus(outcomes, status),
  }));
  const resolvedItems = outcomes.length;
  const recentDeferredOrDeclinedItems = recentOutcomes.filter(
    (outcome) => outcome.status === "deferred" || outcome.status === "declined",
  ).length;

  return {
    totalComparisonItems: comparisonItemCount,
    resolvedItems,
    unresolvedItems: Math.max(0, comparisonItemCount - resolvedItems),
    resolutionRate: comparisonItemCount === 0
      ? 0
      : Number(((resolvedItems / comparisonItemCount) * 100).toFixed(1)),
    recentResolvedItems: recentOutcomes.length,
    recentDeferredOrDeclinedItems,
    countsByStatus,
    countsByEntityType: [
      {
        targetEntityType: "comparison_item",
        count: resolvedItems,
      },
    ],
  };
}

function countStatus(
  outcomes: StoredDecisionOutcome[],
  status: DecisionOutcomeStatus,
): number {
  return outcomes.filter((outcome) => outcome.status === status).length;
}

function toOutcomeReviewResolution(
  outcome: StoredDecisionOutcome,
  target: ComparisonItemResponse | undefined,
): OutcomeReviewResolution {
  return {
    outcome: toDecisionOutcomeResponse(outcome),
    target: targetSummary(outcome, target),
  };
}

function targetSummary(
  outcome: StoredDecisionOutcome,
  target: ComparisonItemResponse | undefined,
): OutcomeReviewTargetSummary {
  if (!target) {
    return {
      targetEntityType: outcome.targetEntityType,
      targetEntityId: outcome.targetEntityId,
      label: "Unavailable comparison item",
    };
  }

  return {
    targetEntityType: "comparison_item",
    targetEntityId: target.id,
    label: target.normalizedFields.parcelId
      ? `Parcel ${target.normalizedFields.parcelId}`
      : `Source row ${target.sourceRowNumber}`,
    datasetId: target.datasetId,
    decision: target.decision,
    investmentScore: target.investmentScore,
    riskScore: target.riskScore,
    propertyTypeCategory: target.normalizedFields.propertyTypeCategory,
    sourceRowNumber: target.sourceRowNumber,
  };
}

function buildSignals(summary: OutcomeReviewSummary, windowDays: number): OutcomeReviewSignal[] {
  const signals: OutcomeReviewSignal[] = [];
  const deferredCount = summary.countsByStatus.find((count) => count.status === "deferred")?.count ?? 0;

  if (summary.resolvedItems === 0) {
    signals.push({
      code: "no_resolved_items",
      severity: "info",
      label: "No final outcomes yet",
      detail: "Resolved comparison decisions will appear here once owners or admins record outcomes.",
    });
    return signals;
  }

  if (summary.unresolvedItems > 0) {
    signals.push({
      code: "unresolved_comparison_items",
      severity: "info",
      label: "Active comparison work remains",
      detail: `${summary.unresolvedItems} comparison ${
        summary.unresolvedItems === 1 ? "item is" : "items are"
      } still without a final outcome.`,
      count: summary.unresolvedItems,
    });
  }

  if (deferredCount > 0) {
    signals.push({
      code: "deferred_outcomes",
      severity: "warning",
      label: "Deferred outcomes need follow-up",
      detail: `${deferredCount} resolved ${
        deferredCount === 1 ? "item is" : "items are"
      } currently deferred.`,
      count: deferredCount,
    });
  }

  if (summary.recentDeferredOrDeclinedItems > 0) {
    signals.push({
      code: "recent_declines",
      severity: "info",
      label: "Recent declines or deferrals",
      detail: `${summary.recentDeferredOrDeclinedItems} recent ${
        summary.recentDeferredOrDeclinedItems === 1 ? "resolution was" : "resolutions were"
      } declined or deferred in the last ${windowDays} days.`,
      count: summary.recentDeferredOrDeclinedItems,
    });
  }

  if (summary.recentResolvedItems === 0) {
    signals.push({
      code: "no_recent_resolutions",
      severity: "info",
      label: "No recent resolution activity",
      detail: `No final outcomes were recorded in the last ${windowDays} days.`,
    });
  }

  return signals;
}
