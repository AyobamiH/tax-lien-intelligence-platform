import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export type ApprovalRequestStatusRecord = "pending" | "approved" | "rejected" | "cancelled";
export type ApprovalTargetEntityTypeRecord = "comparison_item";
export type ApprovalRequestedActionRecord = "comparison_handoff_to_portfolio";
export type ApprovalActorRoleRecord = "owner" | "admin" | "member";

export interface ApprovalRequestRecord {
  workspaceId: string;
  targetEntityType: ApprovalTargetEntityTypeRecord;
  targetEntityId: string;
  requestedAction: ApprovalRequestedActionRecord;
  status: ApprovalRequestStatusRecord;
  requesterUserId: string;
  requesterEmail: string;
  requesterRole: ApprovalActorRoleRecord;
  requestNote: string;
  reviewerUserId?: string;
  reviewerEmail?: string;
  reviewerRole?: ApprovalActorRoleRecord;
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

export type ApprovalRequestDocument = HydratedDocument<ApprovalRequestRecord>;

const approvalRequestSchema = new Schema<ApprovalRequestRecord>(
  {
    workspaceId: { type: String, required: true, trim: true, index: true },
    targetEntityType: { type: String, required: true, enum: ["comparison_item"] },
    targetEntityId: { type: String, required: true, trim: true, index: true },
    requestedAction: {
      type: String,
      required: true,
      enum: ["comparison_handoff_to_portfolio"],
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    requesterUserId: { type: String, required: true, trim: true, index: true },
    requesterEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
    requesterRole: { type: String, required: true, enum: ["owner", "admin", "member"] },
    requestNote: { type: String, required: true, trim: true, maxlength: 500 },
    reviewerUserId: { type: String, trim: true },
    reviewerEmail: { type: String, trim: true, lowercase: true, maxlength: 320 },
    reviewerRole: { type: String, enum: ["owner", "admin", "member"] },
    reviewerResponseNote: { type: String, trim: true, maxlength: 500 },
    reviewClaimToken: { type: String, trim: true },
    reviewClaimedAt: { type: Date },
    outcomeTargetEntityType: { type: String, enum: ["portfolio_item"] },
    outcomeTargetEntityId: { type: String, trim: true },
    outcomeAlreadyExists: { type: Boolean },
    resolvedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

approvalRequestSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
approvalRequestSchema.index({ workspaceId: 1, targetEntityType: 1, targetEntityId: 1, createdAt: -1 });
approvalRequestSchema.index(
  { workspaceId: 1, targetEntityType: 1, targetEntityId: 1, requestedAction: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);

export const ApprovalRequestModel: Model<ApprovalRequestRecord> =
  mongoose.models.ApprovalRequest ??
  mongoose.model<ApprovalRequestRecord>("ApprovalRequest", approvalRequestSchema);
