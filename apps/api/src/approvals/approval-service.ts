import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import type {
  ApprovalRequestDetailResponse,
  ApprovalRequestListResponse,
  ApprovalRequestResponse,
  ApprovalRequestStatus,
  ComparisonHandoffToPortfolioResponse,
  ComparisonItemResponse,
  CreateApprovalRequestResponse,
} from "@tax-lien/types";
import { ApiError } from "../errors/api-error.js";
import type { WorkspaceAccessContext } from "../workspaces/workspace-service.js";
import type { ApprovalRequestStore, StoredApprovalRequest } from "./approval-store.js";

const reviewClaimTtlMs = 5 * 60 * 1000;

export interface ApprovalActorInput {
  userId: string;
  email: string;
}

export interface ListApprovalRequestsOptions {
  status?: ApprovalRequestStatus;
  targetEntityType?: "comparison_item";
  targetEntityId?: string;
}

export interface ApprovalActionExecutor {
  getItem(userId: string, comparisonItemId: string): Promise<ComparisonItemResponse>;
  handoffToPortfolio(
    userId: string,
    comparisonItemId: string,
    input: { status?: "tracked" },
  ): Promise<ComparisonHandoffToPortfolioResponse>;
}

export class ApprovalService {
  public constructor(
    private readonly store: ApprovalRequestStore,
    private readonly comparisonService: ApprovalActionExecutor,
  ) {}

  public async create(
    context: WorkspaceAccessContext,
    actor: ApprovalActorInput,
    targetEntityId: string,
    requestNote: string,
  ): Promise<CreateApprovalRequestResponse> {
    await this.assertComparisonTarget(context, targetEntityId);
    const result = await this.store.createRequest({
      workspaceId: context.workspaceId,
      targetEntityType: "comparison_item",
      targetEntityId,
      requestedAction: "comparison_handoff_to_portfolio",
      requesterUserId: actor.userId,
      requesterEmail: actor.email,
      requesterRole: context.role,
      requestNote,
    });
    return {
      approval: this.toResponse(result.request, context, actor.userId),
      alreadyPending: result.alreadyPending,
    };
  }

  public async list(
    context: WorkspaceAccessContext,
    actorUserId: string,
    options: ListApprovalRequestsOptions = {},
  ): Promise<ApprovalRequestListResponse> {
    if (options.targetEntityId && !mongoose.Types.ObjectId.isValid(options.targetEntityId)) {
      throw new ApiError(400, "approval_invalid_target_id", "Approval target id is invalid.");
    }
    const requests = await this.store.listRequests({
      workspaceId: context.workspaceId,
      ...(options.status ? { status: options.status } : {}),
      ...(options.targetEntityType ? { targetEntityType: options.targetEntityType } : {}),
      ...(options.targetEntityId ? { targetEntityId: options.targetEntityId } : {}),
    });
    return { approvals: requests.map((request) => this.toResponse(request, context, actorUserId)) };
  }

  public async get(
    context: WorkspaceAccessContext,
    actorUserId: string,
    approvalRequestId: string,
  ): Promise<ApprovalRequestDetailResponse> {
    const request = await this.requireRequest(context.workspaceId, approvalRequestId);
    return { approval: this.toResponse(request, context, actorUserId) };
  }

  public async assertNoPendingForTarget(
    context: WorkspaceAccessContext,
    targetEntityId: string,
  ): Promise<void> {
    const pending = await this.store.listRequests({
      workspaceId: context.workspaceId,
      status: "pending",
      targetEntityType: "comparison_item",
      targetEntityId,
    });
    if (pending.length > 0) {
      throw new ApiError(
        409,
        "approval_pending_review",
        "Resolve or cancel the pending approval before using the direct handoff.",
      );
    }
  }

  public async approve(
    context: WorkspaceAccessContext,
    actor: ApprovalActorInput,
    approvalRequestId: string,
    responseNote?: string,
  ): Promise<ApprovalRequestDetailResponse> {
    const request = await this.requirePendingReviewable(context, actor.userId, approvalRequestId);
    const reviewClaimToken = randomUUID();
    await this.claimPendingReview(context.workspaceId, request.id, reviewClaimToken);
    try {
      await this.assertComparisonTarget(context, request.targetEntityId);
      const handoff = await this.comparisonService.handoffToPortfolio(
        context.tenantUserId,
        request.targetEntityId,
        { status: "tracked" },
      );
      const resolved = await this.store.resolveClaimed(
        {
          workspaceId: context.workspaceId,
          approvalRequestId: request.id,
          status: "approved",
          reviewerUserId: actor.userId,
          reviewerEmail: actor.email,
          reviewerRole: context.role as "owner" | "admin",
          ...(responseNote ? { reviewerResponseNote: responseNote } : {}),
          outcomeTargetEntityType: "portfolio_item",
          outcomeTargetEntityId: handoff.item.id,
          outcomeAlreadyExists: handoff.alreadyExists,
          resolvedAt: new Date(),
        },
        reviewClaimToken,
      );
      if (!resolved) {
        throw new ApiError(409, "approval_already_resolved", "Approval request is no longer pending.");
      }
      return { approval: this.toResponse(resolved, context, actor.userId) };
    } catch (error) {
      await this.store.releaseReviewClaim(request.id, context.workspaceId, reviewClaimToken);
      throw error;
    }
  }

  public async reject(
    context: WorkspaceAccessContext,
    actor: ApprovalActorInput,
    approvalRequestId: string,
    responseNote: string,
  ): Promise<ApprovalRequestDetailResponse> {
    const request = await this.requirePendingReviewable(context, actor.userId, approvalRequestId);
    const reviewClaimToken = randomUUID();
    await this.claimPendingReview(context.workspaceId, request.id, reviewClaimToken);
    try {
      const resolved = await this.store.resolveClaimed(
        {
          workspaceId: context.workspaceId,
          approvalRequestId: request.id,
          status: "rejected",
          reviewerUserId: actor.userId,
          reviewerEmail: actor.email,
          reviewerRole: context.role as "owner" | "admin",
          reviewerResponseNote: responseNote,
          resolvedAt: new Date(),
        },
        reviewClaimToken,
      );
      if (!resolved) {
        throw new ApiError(409, "approval_already_resolved", "Approval request is no longer pending.");
      }
      return { approval: this.toResponse(resolved, context, actor.userId) };
    } catch (error) {
      await this.store.releaseReviewClaim(request.id, context.workspaceId, reviewClaimToken);
      throw error;
    }
  }

  public async cancel(
    context: WorkspaceAccessContext,
    actorUserId: string,
    approvalRequestId: string,
  ): Promise<ApprovalRequestDetailResponse> {
    const request = await this.requireRequest(context.workspaceId, approvalRequestId);
    if (request.status !== "pending") {
      throw new ApiError(409, "approval_already_resolved", "Approval request is no longer pending.");
    }
    if (request.requesterUserId !== actorUserId) {
      throw new ApiError(403, "approval_cancel_forbidden", "Only the requester can cancel this approval.");
    }
    const cancelled = await this.store.cancelPending(
      request.id,
      context.workspaceId,
      actorUserId,
      new Date(),
      staleReviewClaimBefore(),
    );
    if (!cancelled) {
      throw new ApiError(409, "approval_already_resolved", "Approval request is no longer pending.");
    }
    return { approval: this.toResponse(cancelled, context, actorUserId) };
  }

  private async requirePendingReviewable(
    context: WorkspaceAccessContext,
    actorUserId: string,
    approvalRequestId: string,
  ): Promise<StoredApprovalRequest> {
    const request = await this.requireRequest(context.workspaceId, approvalRequestId);
    if (request.status !== "pending") {
      throw new ApiError(409, "approval_already_resolved", "Approval request is no longer pending.");
    }
    if (context.role !== "owner" && context.role !== "admin") {
      throw new ApiError(403, "approval_review_forbidden", "Your workspace role cannot review approvals.");
    }
    if (request.requesterUserId === actorUserId) {
      throw new ApiError(403, "approval_self_review_forbidden", "Requesters cannot review their own approval.");
    }
    return request;
  }

  private async claimPendingReview(
    workspaceId: string,
    approvalRequestId: string,
    reviewClaimToken: string,
  ): Promise<void> {
    const claimedAt = new Date();
    const claimed = await this.store.claimPendingReview(
      approvalRequestId,
      workspaceId,
      reviewClaimToken,
      claimedAt,
      staleReviewClaimBefore(claimedAt),
    );
    if (!claimed) {
      throw new ApiError(
        409,
        "approval_review_in_progress",
        "This approval is already being reviewed or is no longer pending.",
      );
    }
  }

  private async requireRequest(
    workspaceId: string,
    approvalRequestId: string,
  ): Promise<StoredApprovalRequest> {
    if (!mongoose.Types.ObjectId.isValid(approvalRequestId)) {
      throw new ApiError(400, "approval_invalid_id", "Approval request id is invalid.");
    }
    const request = await this.store.findByIdInWorkspace(approvalRequestId, workspaceId);
    if (!request) {
      throw new ApiError(404, "approval_not_found", "Approval request was not found.");
    }
    return request;
  }

  private async assertComparisonTarget(
    context: WorkspaceAccessContext,
    targetEntityId: string,
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(targetEntityId)) {
      throw new ApiError(400, "approval_invalid_target_id", "Approval target id is invalid.");
    }
    try {
      await this.comparisonService.getItem(context.tenantUserId, targetEntityId);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        throw new ApiError(409, "approval_target_stale", "Approval target is no longer available.");
      }
      throw error;
    }
  }

  private toResponse(
    request: StoredApprovalRequest,
    context: WorkspaceAccessContext,
    actorUserId: string,
  ): ApprovalRequestResponse {
    return {
      id: request.id,
      workspaceId: request.workspaceId,
      targetEntityType: request.targetEntityType,
      targetEntityId: request.targetEntityId,
      requestedAction: request.requestedAction,
      status: request.status,
      requester: {
        userId: request.requesterUserId,
        email: request.requesterEmail,
        role: request.requesterRole,
      },
      requestNote: request.requestNote,
      ...(request.reviewerUserId && request.reviewerEmail && request.reviewerRole
        ? {
            reviewer: {
              userId: request.reviewerUserId,
              email: request.reviewerEmail,
              role: request.reviewerRole,
            },
          }
        : {}),
      ...(request.reviewerResponseNote
        ? { reviewerResponseNote: request.reviewerResponseNote }
        : {}),
      ...(request.outcomeTargetEntityType &&
      request.outcomeTargetEntityId &&
      request.outcomeAlreadyExists !== undefined
        ? {
            outcome: {
              targetEntityType: request.outcomeTargetEntityType,
              targetEntityId: request.outcomeTargetEntityId,
              alreadyExists: request.outcomeAlreadyExists,
            },
          }
        : {}),
      canReview:
        request.status === "pending" &&
        !hasActiveReviewClaim(request) &&
        request.requesterUserId !== actorUserId &&
        (context.role === "owner" || context.role === "admin"),
      canCancel:
        request.status === "pending" &&
        !hasActiveReviewClaim(request) &&
        request.requesterUserId === actorUserId,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      ...(request.resolvedAt ? { resolvedAt: request.resolvedAt.toISOString() } : {}),
    };
  }
}

function staleReviewClaimBefore(now = new Date()): Date {
  return new Date(now.getTime() - reviewClaimTtlMs);
}

function hasActiveReviewClaim(request: StoredApprovalRequest): boolean {
  return Boolean(
    request.reviewClaimToken &&
      request.reviewClaimedAt &&
      request.reviewClaimedAt >= staleReviewClaimBefore(),
  );
}
