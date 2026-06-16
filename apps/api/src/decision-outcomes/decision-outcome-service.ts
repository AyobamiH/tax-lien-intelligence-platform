import mongoose from "mongoose";
import type {
  ApprovalRequestListResponse,
  ComparisonItemResponse,
  DecisionOutcomeResponse,
  DecisionOutcomeStateResponse,
  DecisionOutcomeStatus,
  DecisionOutcomeTargetEntityType,
  UpsertDecisionOutcomeResponse,
  WorkspacePolicyEvaluation,
} from "@tax-lien/types";
import type { ApprovalService } from "../approvals/approval-service.js";
import type { ComparisonService } from "../comparison/comparison-service.js";
import { ApiError } from "../errors/api-error.js";
import type { WorkspacePolicyService } from "../workspace-policies/workspace-policy-service.js";
import type { WorkspaceAccessContext } from "../workspaces/workspace-service.js";
import type {
  DecisionOutcomeStore,
  StoredDecisionOutcome,
} from "./decision-outcome-store.js";

export const decisionOutcomeStatuses = ["approved", "declined", "deferred", "archived"] as const;
const maxResolutionNoteLength = 1000;
const unsafeNoteControlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

export interface DecisionOutcomeActorInput {
  userId: string;
  email: string;
}

export class DecisionOutcomeService {
  public constructor(
    private readonly store: DecisionOutcomeStore,
    private readonly comparisonService: Pick<ComparisonService, "getItem">,
    private readonly approvalService: Pick<ApprovalService, "list">,
    private readonly policyService: Pick<WorkspacePolicyService, "evaluateComparisonAction">,
  ) {}

  public async getState(
    context: WorkspaceAccessContext,
    targetEntityType: DecisionOutcomeTargetEntityType,
    targetEntityId: string,
  ): Promise<DecisionOutcomeStateResponse> {
    await this.assertTargetAccess(context, targetEntityType, targetEntityId);
    return this.stateFor(
      targetEntityType,
      targetEntityId,
      await this.store.findForTarget(context.workspaceId, targetEntityType, targetEntityId),
    );
  }

  public async resolve(
    context: WorkspaceAccessContext,
    actor: DecisionOutcomeActorInput,
    targetEntityType: DecisionOutcomeTargetEntityType,
    targetEntityId: string,
    status: DecisionOutcomeStatus,
    note: string,
  ): Promise<UpsertDecisionOutcomeResponse> {
    await this.assertTargetAccess(context, targetEntityType, targetEntityId);
    const normalizedNote = normalizeResolutionNote(note);
    if (status === "approved") {
      await this.assertApprovedOutcomePrerequisites(context, targetEntityId);
    }

    const previous = await this.store.findForTarget(
      context.workspaceId,
      targetEntityType,
      targetEntityId,
    );
    if (previous?.status === status && previous.note === normalizedNote) {
      return {
        state: this.stateFor(targetEntityType, targetEntityId, previous),
        changed: false,
      };
    }

    const resolved = await this.store.upsertForTarget({
      workspaceId: context.workspaceId,
      targetEntityType,
      targetEntityId,
      status,
      resolverUserId: actor.userId,
      resolverEmail: actor.email,
      resolverRole: context.role,
      note: normalizedNote,
      resolvedAt: new Date(),
    });
    return {
      state: this.stateFor(targetEntityType, targetEntityId, resolved),
      changed: true,
    };
  }

  private async assertTargetAccess(
    context: WorkspaceAccessContext,
    targetEntityType: DecisionOutcomeTargetEntityType,
    targetEntityId: string,
  ): Promise<ComparisonItemResponse> {
    if (!mongoose.Types.ObjectId.isValid(targetEntityId)) {
      throw new ApiError(400, "decision_outcome_invalid_target_id", "Decision outcome target id is invalid.");
    }
    switch (targetEntityType) {
      case "comparison_item":
        return this.comparisonService.getItem(context.tenantUserId, targetEntityId);
    }
  }

  private async assertApprovedOutcomePrerequisites(
    context: WorkspaceAccessContext,
    comparisonItemId: string,
  ): Promise<void> {
    const evaluation = await this.policyService.evaluateComparisonAction(
      context,
      "approval_request_comparison_portfolio",
      comparisonItemId,
    );
    if (!evaluation.allowed) {
      throw blockedByPolicy(evaluation);
    }
    const approvals = await this.approvalService.list(context, context.tenantUserId, {
      targetEntityType: "comparison_item",
      targetEntityId: comparisonItemId,
      status: "pending",
    });
    if (approvals.approvals.length > 0) {
      throw new ApiError(
        409,
        "decision_outcome_pending_approval",
        "Resolve or cancel pending approvals before recording an approved final outcome.",
      );
    }
  }

  private stateFor(
    targetEntityType: DecisionOutcomeTargetEntityType,
    targetEntityId: string,
    outcome: StoredDecisionOutcome | null,
  ): DecisionOutcomeStateResponse {
    return {
      targetEntityType,
      targetEntityId,
      resolved: Boolean(outcome),
      ...(outcome ? { outcome: toDecisionOutcomeResponse(outcome) } : {}),
    };
  }
}

function blockedByPolicy(evaluation: WorkspacePolicyEvaluation): ApiError {
  return new ApiError(
    409,
    "decision_outcome_prerequisite_blocked",
    evaluation.unmetRequirements
      .map((requirement) => `${requirement.message} ${requirement.resolution}`)
      .join(" "),
    evaluation,
  );
}

function normalizeResolutionNote(note: string): string {
  const normalized = note.trim();
  if (!normalized) {
    throw new ApiError(400, "decision_outcome_note_required", "Resolution note is required.");
  }
  if (normalized.length > maxResolutionNoteLength) {
    throw new ApiError(
      400,
      "decision_outcome_note_too_long",
      `Resolution note cannot exceed ${maxResolutionNoteLength} characters.`,
    );
  }
  if (unsafeNoteControlCharacters.test(normalized)) {
    throw new ApiError(400, "decision_outcome_invalid_note", "Resolution note contains unsupported characters.");
  }
  return normalized;
}

export function toDecisionOutcomeResponse(outcome: StoredDecisionOutcome): DecisionOutcomeResponse {
  return {
    id: outcome.id,
    workspaceId: outcome.workspaceId,
    targetEntityType: outcome.targetEntityType,
    targetEntityId: outcome.targetEntityId,
    status: outcome.status,
    resolver: {
      userId: outcome.resolverUserId,
      email: outcome.resolverEmail,
      role: outcome.resolverRole,
    },
    note: outcome.note,
    resolvedAt: outcome.resolvedAt.toISOString(),
    createdAt: outcome.createdAt.toISOString(),
    updatedAt: outcome.updatedAt.toISOString(),
  };
}
