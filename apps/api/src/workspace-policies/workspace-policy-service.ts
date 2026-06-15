import type {
  WorkspacePolicyAction,
  WorkspacePolicyEvaluation,
  WorkspacePolicyResponse,
  WorkspacePolicyRules,
  WorkspacePolicyUnmetRequirement,
} from "@tax-lien/types";
import { ApiError } from "../errors/api-error.js";
import type { ReviewChecklistService } from "../review-checklists/review-checklist-service.js";
import type { WorkspaceAssignmentService } from "../workspace-assignments/workspace-assignment-service.js";
import type { WorkspaceAccessContext } from "../workspaces/workspace-service.js";
import type {
  StoredWorkspacePolicy,
  WorkspacePolicyStore,
} from "./workspace-policy-store.js";

export const defaultWorkspacePolicyRules: WorkspacePolicyRules = {
  requireAssignmentBeforeComparisonHandoff: false,
  requireChecklistBeforeComparisonHandoff: false,
  requireApprovalForComparisonPortfolio: false,
};

export class WorkspacePolicyService {
  public constructor(
    private readonly store: WorkspacePolicyStore,
    private readonly assignmentService: Pick<WorkspaceAssignmentService, "get">,
    private readonly checklistService: Pick<ReviewChecklistService, "getState">,
  ) {}

  public async get(context: WorkspaceAccessContext): Promise<WorkspacePolicyResponse> {
    return toResponse(
      context.workspaceId,
      await this.store.findForWorkspace(context.workspaceId),
    );
  }

  public async update(
    context: WorkspaceAccessContext,
    actorUserId: string,
    rules: WorkspacePolicyRules,
  ): Promise<WorkspacePolicyResponse> {
    if (context.role !== "owner" && context.role !== "admin") {
      throw new ApiError(
        403,
        "workspace_role_forbidden",
        "Your workspace role cannot manage workspace policy.",
      );
    }
    return toResponse(
      context.workspaceId,
      await this.store.save({
        workspaceId: context.workspaceId,
        rules,
        updatedByUserId: actorUserId,
      }),
    );
  }

  public async evaluateComparisonAction(
    context: WorkspaceAccessContext,
    action: WorkspacePolicyAction,
    comparisonItemId: string,
    options: { approvalSatisfied?: boolean } = {},
  ): Promise<WorkspacePolicyEvaluation> {
    const policy = await this.get(context);
    const unmetRequirements: WorkspacePolicyUnmetRequirement[] = [];

    if (policy.rules.requireAssignmentBeforeComparisonHandoff) {
      const assignment = await this.assignmentService.get(
        context,
        "comparison_item",
        comparisonItemId,
      );
      if (!assignment.assignment) {
        unmetRequirements.push({
          code: "assignment_required",
          message: "Assignment is required before this comparison item can move forward.",
          resolution: "Assign the comparison item to an active workspace member.",
        });
      }
    }

    if (policy.rules.requireChecklistBeforeComparisonHandoff) {
      const checklist = await this.checklistService.getState(
        context,
        "comparison_item",
        comparisonItemId,
      );
      if (!checklist.template || !checklist.progress.allRequiredComplete) {
        unmetRequirements.push({
          code: "checklist_required",
          message: checklist.template
            ? "All required review checklist items must be complete before this action."
            : "An active comparison review checklist is required before this action.",
          resolution: checklist.template
            ? "Complete every required comparison checklist item."
            : "Ask a workspace owner or administrator to configure an active comparison checklist.",
        });
      }
    }

    if (
      action === "comparison_handoff_to_portfolio" &&
      policy.rules.requireApprovalForComparisonPortfolio &&
      !options.approvalSatisfied
    ) {
      unmetRequirements.push({
        code: "approval_required",
        message: "Workspace policy requires approval before moving this item to portfolio.",
        resolution: "Create an approval request and have a different owner or administrator approve it.",
      });
    }

    return {
      action,
      allowed: unmetRequirements.length === 0,
      unmetRequirements,
    };
  }

  public async enforceComparisonAction(
    context: WorkspaceAccessContext,
    action: WorkspacePolicyAction,
    comparisonItemId: string,
    options: { approvalSatisfied?: boolean } = {},
  ): Promise<void> {
    const evaluation = await this.evaluateComparisonAction(
      context,
      action,
      comparisonItemId,
      options,
    );
    if (evaluation.allowed) {
      return;
    }
    throw new ApiError(
      409,
      "workspace_policy_blocked",
      evaluation.unmetRequirements
        .map((requirement) => `${requirement.message} ${requirement.resolution}`)
        .join(" "),
      evaluation,
    );
  }
}

function toResponse(
  workspaceId: string,
  policy: StoredWorkspacePolicy | null,
): WorkspacePolicyResponse {
  if (!policy) {
    return { workspaceId, rules: { ...defaultWorkspacePolicyRules } };
  }
  return {
    workspaceId,
    rules: policy.rules,
    updatedByUserId: policy.updatedByUserId,
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
  };
}
