import mongoose from "mongoose";
import type {
  ApprovalRequestStore,
  CreateApprovalRequestInput,
  CreateApprovalRequestResult,
  ListApprovalRequestsInput,
  ResolveApprovalRequestInput,
  StoredApprovalRequest,
} from "../../apps/api/src/approvals/approval-store.js";

export class InMemoryApprovalRequestStore implements ApprovalRequestStore {
  private readonly requests = new Map<string, StoredApprovalRequest>();

  public async createRequest(input: CreateApprovalRequestInput): Promise<CreateApprovalRequestResult> {
    const pending = [...this.requests.values()].find(
      (request) =>
        request.workspaceId === input.workspaceId &&
        request.targetEntityType === input.targetEntityType &&
        request.targetEntityId === input.targetEntityId &&
        request.requestedAction === input.requestedAction &&
        request.status === "pending",
    );
    if (pending) {
      return { request: pending, alreadyPending: true };
    }
    const now = new Date();
    const request: StoredApprovalRequest = {
      id: new mongoose.Types.ObjectId().toString(),
      ...input,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    this.requests.set(request.id, request);
    return { request, alreadyPending: false };
  }

  public async findByIdInWorkspace(
    approvalRequestId: string,
    workspaceId: string,
  ): Promise<StoredApprovalRequest | null> {
    const request = this.requests.get(approvalRequestId);
    return request?.workspaceId === workspaceId ? request : null;
  }

  public async listRequests(input: ListApprovalRequestsInput): Promise<StoredApprovalRequest[]> {
    return [...this.requests.values()]
      .filter(
        (request) =>
          request.workspaceId === input.workspaceId &&
          (!input.status || request.status === input.status) &&
          (!input.targetEntityType || request.targetEntityType === input.targetEntityType) &&
          (!input.targetEntityId || request.targetEntityId === input.targetEntityId),
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  public async claimPendingReview(
    approvalRequestId: string,
    workspaceId: string,
    reviewClaimToken: string,
    claimedAt: Date,
    staleBefore: Date,
  ): Promise<StoredApprovalRequest | null> {
    const request = await this.findByIdInWorkspace(approvalRequestId, workspaceId);
    if (
      !request ||
      request.status !== "pending" ||
      (request.reviewClaimToken &&
        request.reviewClaimedAt &&
        request.reviewClaimedAt >= staleBefore)
    ) {
      return null;
    }
    const claimed = { ...request, reviewClaimToken, reviewClaimedAt: claimedAt, updatedAt: claimedAt };
    this.requests.set(claimed.id, claimed);
    return claimed;
  }

  public async resolveClaimed(
    input: ResolveApprovalRequestInput,
    reviewClaimToken: string,
  ): Promise<StoredApprovalRequest | null> {
    const request = await this.findByIdInWorkspace(input.approvalRequestId, input.workspaceId);
    if (
      !request ||
      request.status !== "pending" ||
      request.reviewClaimToken !== reviewClaimToken
    ) {
      return null;
    }
    const {
      reviewClaimToken: _reviewClaimToken,
      reviewClaimedAt: _reviewClaimedAt,
      ...unclaimed
    } = request;
    const resolved: StoredApprovalRequest = {
      ...unclaimed,
      status: input.status,
      reviewerUserId: input.reviewerUserId,
      reviewerEmail: input.reviewerEmail,
      reviewerRole: input.reviewerRole,
      ...(input.reviewerResponseNote ? { reviewerResponseNote: input.reviewerResponseNote } : {}),
      ...(input.outcomeTargetEntityType
        ? { outcomeTargetEntityType: input.outcomeTargetEntityType }
        : {}),
      ...(input.outcomeTargetEntityId
        ? { outcomeTargetEntityId: input.outcomeTargetEntityId }
        : {}),
      ...(input.outcomeAlreadyExists !== undefined
        ? { outcomeAlreadyExists: input.outcomeAlreadyExists }
        : {}),
      resolvedAt: input.resolvedAt,
      updatedAt: input.resolvedAt,
    };
    this.requests.set(resolved.id, resolved);
    return resolved;
  }

  public async releaseReviewClaim(
    approvalRequestId: string,
    workspaceId: string,
    reviewClaimToken: string,
  ): Promise<void> {
    const request = await this.findByIdInWorkspace(approvalRequestId, workspaceId);
    if (!request || request.reviewClaimToken !== reviewClaimToken) {
      return;
    }
    const {
      reviewClaimToken: _reviewClaimToken,
      reviewClaimedAt: _reviewClaimedAt,
      ...released
    } = request;
    this.requests.set(request.id, released);
  }

  public async cancelPending(
    approvalRequestId: string,
    workspaceId: string,
    requesterUserId: string,
    resolvedAt: Date,
    staleBefore: Date,
  ): Promise<StoredApprovalRequest | null> {
    const request = await this.findByIdInWorkspace(approvalRequestId, workspaceId);
    if (
      !request ||
      request.status !== "pending" ||
      request.requesterUserId !== requesterUserId ||
      (request.reviewClaimToken &&
        request.reviewClaimedAt &&
        request.reviewClaimedAt >= staleBefore)
    ) {
      return null;
    }
    const {
      reviewClaimToken: _reviewClaimToken,
      reviewClaimedAt: _reviewClaimedAt,
      ...unclaimed
    } = request;
    const cancelled: StoredApprovalRequest = {
      ...unclaimed,
      status: "cancelled",
      resolvedAt,
      updatedAt: resolvedAt,
    };
    this.requests.set(cancelled.id, cancelled);
    return cancelled;
  }
}
