import {
  ApprovalRequestModel,
  type ApprovalRequestDocument,
} from "@tax-lien/db";
import type {
  ApprovalRequestedAction,
  ApprovalRequestStatus,
  ApprovalTargetEntityType,
  WorkspaceRole,
} from "@tax-lien/types";

export interface StoredApprovalRequest {
  id: string;
  workspaceId: string;
  targetEntityType: ApprovalTargetEntityType;
  targetEntityId: string;
  requestedAction: ApprovalRequestedAction;
  status: ApprovalRequestStatus;
  requesterUserId: string;
  requesterEmail: string;
  requesterRole: WorkspaceRole;
  requestNote: string;
  reviewerUserId?: string;
  reviewerEmail?: string;
  reviewerRole?: WorkspaceRole;
  reviewerResponseNote?: string;
  reviewClaimToken?: string;
  reviewClaimedAt?: Date;
  outcomeTargetEntityType?: "portfolio_item";
  outcomeTargetEntityId?: string;
  outcomeAlreadyExists?: boolean;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApprovalRequestInput {
  workspaceId: string;
  targetEntityType: ApprovalTargetEntityType;
  targetEntityId: string;
  requestedAction: ApprovalRequestedAction;
  requesterUserId: string;
  requesterEmail: string;
  requesterRole: WorkspaceRole;
  requestNote: string;
}

export interface CreateApprovalRequestResult {
  request: StoredApprovalRequest;
  alreadyPending: boolean;
}

export interface ListApprovalRequestsInput {
  workspaceId: string;
  status?: ApprovalRequestStatus;
  targetEntityType?: ApprovalTargetEntityType;
  targetEntityId?: string;
}

export interface ResolveApprovalRequestInput {
  workspaceId: string;
  approvalRequestId: string;
  status: "approved" | "rejected";
  reviewerUserId: string;
  reviewerEmail: string;
  reviewerRole: Extract<WorkspaceRole, "owner" | "admin">;
  reviewerResponseNote?: string;
  outcomeTargetEntityType?: "portfolio_item";
  outcomeTargetEntityId?: string;
  outcomeAlreadyExists?: boolean;
  resolvedAt: Date;
}

export interface ApprovalRequestStore {
  createRequest(input: CreateApprovalRequestInput): Promise<CreateApprovalRequestResult>;
  findByIdInWorkspace(approvalRequestId: string, workspaceId: string): Promise<StoredApprovalRequest | null>;
  listRequests(input: ListApprovalRequestsInput): Promise<StoredApprovalRequest[]>;
  claimPendingReview(
    approvalRequestId: string,
    workspaceId: string,
    reviewClaimToken: string,
    claimedAt: Date,
    staleBefore: Date,
  ): Promise<StoredApprovalRequest | null>;
  resolveClaimed(
    input: ResolveApprovalRequestInput,
    reviewClaimToken: string,
  ): Promise<StoredApprovalRequest | null>;
  releaseReviewClaim(
    approvalRequestId: string,
    workspaceId: string,
    reviewClaimToken: string,
  ): Promise<void>;
  cancelPending(
    approvalRequestId: string,
    workspaceId: string,
    requesterUserId: string,
    resolvedAt: Date,
    staleBefore: Date,
  ): Promise<StoredApprovalRequest | null>;
}

export class MongoApprovalRequestStore implements ApprovalRequestStore {
  public async createRequest(input: CreateApprovalRequestInput): Promise<CreateApprovalRequestResult> {
    const pending = await ApprovalRequestModel.findOne({
      workspaceId: input.workspaceId,
      targetEntityType: input.targetEntityType,
      targetEntityId: input.targetEntityId,
      requestedAction: input.requestedAction,
      status: "pending",
    }).exec();
    if (pending) {
      return { request: mapApprovalRequest(pending), alreadyPending: true };
    }

    try {
      const document = await ApprovalRequestModel.create({ ...input, status: "pending" });
      return { request: mapApprovalRequest(document), alreadyPending: false };
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) {
        const duplicate = await ApprovalRequestModel.findOne({
          workspaceId: input.workspaceId,
          targetEntityType: input.targetEntityType,
          targetEntityId: input.targetEntityId,
          requestedAction: input.requestedAction,
          status: "pending",
        }).exec();
        if (duplicate) {
          return { request: mapApprovalRequest(duplicate), alreadyPending: true };
        }
      }
      throw error;
    }
  }

  public async findByIdInWorkspace(
    approvalRequestId: string,
    workspaceId: string,
  ): Promise<StoredApprovalRequest | null> {
    const document = await ApprovalRequestModel.findOne({
      _id: approvalRequestId,
      workspaceId,
    }).exec();
    return document ? mapApprovalRequest(document) : null;
  }

  public async listRequests(input: ListApprovalRequestsInput): Promise<StoredApprovalRequest[]> {
    const documents = await ApprovalRequestModel.find({
      workspaceId: input.workspaceId,
      ...(input.status ? { status: input.status } : {}),
      ...(input.targetEntityType ? { targetEntityType: input.targetEntityType } : {}),
      ...(input.targetEntityId ? { targetEntityId: input.targetEntityId } : {}),
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(100)
      .exec();
    return documents.map(mapApprovalRequest);
  }

  public async claimPendingReview(
    approvalRequestId: string,
    workspaceId: string,
    reviewClaimToken: string,
    claimedAt: Date,
    staleBefore: Date,
  ): Promise<StoredApprovalRequest | null> {
    const document = await ApprovalRequestModel.findOneAndUpdate(
      {
        _id: approvalRequestId,
        workspaceId,
        status: "pending",
        $or: [
          { reviewClaimToken: { $exists: false } },
          { reviewClaimedAt: { $lt: staleBefore } },
        ],
      },
      { $set: { reviewClaimToken, reviewClaimedAt: claimedAt } },
      { new: true },
    ).exec();
    return document ? mapApprovalRequest(document) : null;
  }

  public async resolveClaimed(
    input: ResolveApprovalRequestInput,
    reviewClaimToken: string,
  ): Promise<StoredApprovalRequest | null> {
    const document = await ApprovalRequestModel.findOneAndUpdate(
      {
        _id: input.approvalRequestId,
        workspaceId: input.workspaceId,
        status: "pending",
        reviewClaimToken,
      },
      {
        $set: {
          status: input.status,
          reviewerUserId: input.reviewerUserId,
          reviewerEmail: input.reviewerEmail,
          reviewerRole: input.reviewerRole,
          ...(input.reviewerResponseNote ? { reviewerResponseNote: input.reviewerResponseNote } : {}),
          ...(input.outcomeTargetEntityType ? { outcomeTargetEntityType: input.outcomeTargetEntityType } : {}),
          ...(input.outcomeTargetEntityId ? { outcomeTargetEntityId: input.outcomeTargetEntityId } : {}),
          ...(input.outcomeAlreadyExists !== undefined
            ? { outcomeAlreadyExists: input.outcomeAlreadyExists }
            : {}),
          resolvedAt: input.resolvedAt,
        },
        $unset: { reviewClaimToken: "", reviewClaimedAt: "" },
      },
      { new: true },
    ).exec();
    return document ? mapApprovalRequest(document) : null;
  }

  public async releaseReviewClaim(
    approvalRequestId: string,
    workspaceId: string,
    reviewClaimToken: string,
  ): Promise<void> {
    await ApprovalRequestModel.updateOne(
      { _id: approvalRequestId, workspaceId, status: "pending", reviewClaimToken },
      { $unset: { reviewClaimToken: "", reviewClaimedAt: "" } },
    ).exec();
  }

  public async cancelPending(
    approvalRequestId: string,
    workspaceId: string,
    requesterUserId: string,
    resolvedAt: Date,
    staleBefore: Date,
  ): Promise<StoredApprovalRequest | null> {
    const document = await ApprovalRequestModel.findOneAndUpdate(
      {
        _id: approvalRequestId,
        workspaceId,
        requesterUserId,
        status: "pending",
        $or: [
          { reviewClaimToken: { $exists: false } },
          { reviewClaimedAt: { $lt: staleBefore } },
        ],
      },
      {
        $set: { status: "cancelled", resolvedAt },
        $unset: { reviewClaimToken: "", reviewClaimedAt: "" },
      },
      { new: true },
    ).exec();
    return document ? mapApprovalRequest(document) : null;
  }
}

function mapApprovalRequest(document: ApprovalRequestDocument): StoredApprovalRequest {
  return {
    id: document.id,
    workspaceId: document.workspaceId,
    targetEntityType: document.targetEntityType,
    targetEntityId: document.targetEntityId,
    requestedAction: document.requestedAction,
    status: document.status,
    requesterUserId: document.requesterUserId,
    requesterEmail: document.requesterEmail,
    requesterRole: document.requesterRole,
    requestNote: document.requestNote,
    ...(document.reviewerUserId ? { reviewerUserId: document.reviewerUserId } : {}),
    ...(document.reviewerEmail ? { reviewerEmail: document.reviewerEmail } : {}),
    ...(document.reviewerRole ? { reviewerRole: document.reviewerRole } : {}),
    ...(document.reviewerResponseNote ? { reviewerResponseNote: document.reviewerResponseNote } : {}),
    ...(document.reviewClaimToken ? { reviewClaimToken: document.reviewClaimToken } : {}),
    ...(document.reviewClaimedAt ? { reviewClaimedAt: document.reviewClaimedAt } : {}),
    ...(document.outcomeTargetEntityType
      ? { outcomeTargetEntityType: document.outcomeTargetEntityType }
      : {}),
    ...(document.outcomeTargetEntityId ? { outcomeTargetEntityId: document.outcomeTargetEntityId } : {}),
    ...(document.outcomeAlreadyExists !== undefined
      ? { outcomeAlreadyExists: document.outcomeAlreadyExists }
      : {}),
    ...(document.resolvedAt ? { resolvedAt: document.resolvedAt } : {}),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
