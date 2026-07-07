import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export type WorkspaceActivityCategoryRecord =
  | "data"
  | "decisions"
  | "portfolio"
  | "members"
  | "responsibility"
  | "approvals";
export type WorkspaceActivityEventTypeRecord =
  | "dataset_uploaded"
  | "dataset_scoring_requested"
  | "dataset_refresh_requested"
  | "dataset_scoring_rate_limited"
  | "dataset_refresh_rate_limited"
  | "comparison_decision_changed"
  | "comparison_handoff_to_watchlist"
  | "comparison_handoff_to_portfolio"
  | "portfolio_status_changed"
  | "workspace_member_added"
  | "workspace_member_role_changed"
  | "workspace_member_removed"
  | "entity_assigned"
  | "entity_reassigned"
  | "entity_assignment_cleared"
  | "approval_requested"
  | "approval_approved"
  | "approval_rejected"
  | "approval_cancelled"
  | "decision_outcome_resolved";
export type WorkspaceActivityRelatedEntityTypeRecord =
  | "dataset"
  | "job"
  | "comparison_item"
  | "watchlist_item"
  | "portfolio_item"
  | "workspace_membership";
export interface WorkspaceActivityMetadataRecord {
  datasetId?: string;
  datasetName?: string;
  jobId?: string;
  requestKind?: "score" | "refresh";
  rateLimitRetryAfterMs?: number;
  previousDecision?: "undecided" | "keep_reviewing" | "move_forward" | "rejected";
  newDecision?: "undecided" | "keep_reviewing" | "move_forward" | "rejected";
  targetEntityType?: "dataset" | "comparison_item" | "watchlist_item" | "portfolio_item";
  targetEntityId?: string;
  previousStatus?: "tracked" | "reviewing" | "ready" | "acquired" | "closed" | "discarded";
  newStatus?: "tracked" | "reviewing" | "ready" | "acquired" | "closed" | "discarded";
  memberUserId?: string;
  memberEmail?: string;
  previousRole?: "admin" | "member";
  role?: "admin" | "member";
  assigneeUserId?: string;
  assigneeEmail?: string;
  previousAssigneeUserId?: string;
  previousAssigneeEmail?: string;
  approvalRequestId?: string;
  approvalAction?: "comparison_handoff_to_portfolio";
  approvalStatus?: "pending" | "approved" | "rejected" | "cancelled";
  approvalRequesterEmail?: string;
  approvalReviewerEmail?: string;
  decisionOutcomeId?: string;
  decisionOutcomeStatus?: "approved" | "declined" | "deferred" | "archived";
  decisionOutcomeResolverEmail?: string;
}

export interface WorkspaceActivityRecord {
  workspaceId: string;
  actorUserId: string;
  actorEmail: string;
  category: WorkspaceActivityCategoryRecord;
  eventType: WorkspaceActivityEventTypeRecord;
  relatedEntityType: WorkspaceActivityRelatedEntityTypeRecord;
  relatedEntityId: string;
  summary: string;
  metadata?: WorkspaceActivityMetadataRecord;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkspaceActivityDocument = HydratedDocument<WorkspaceActivityRecord>;

const workspaceActivityMetadataSchema = new Schema<WorkspaceActivityMetadataRecord>(
  {
    datasetId: { type: String, trim: true },
    datasetName: { type: String, trim: true, maxlength: 255 },
    jobId: { type: String, trim: true },
    requestKind: { type: String, enum: ["score", "refresh"] },
    rateLimitRetryAfterMs: { type: Number, min: 0, max: 3_600_000 },
    previousDecision: { type: String, enum: ["undecided", "keep_reviewing", "move_forward", "rejected"] },
    newDecision: { type: String, enum: ["undecided", "keep_reviewing", "move_forward", "rejected"] },
    targetEntityType: {
      type: String,
      enum: ["dataset", "comparison_item", "watchlist_item", "portfolio_item"],
    },
    targetEntityId: { type: String, trim: true },
    previousStatus: { type: String, enum: ["tracked", "reviewing", "ready", "acquired", "closed", "discarded"] },
    newStatus: { type: String, enum: ["tracked", "reviewing", "ready", "acquired", "closed", "discarded"] },
    memberUserId: { type: String, trim: true },
    memberEmail: { type: String, trim: true, lowercase: true, maxlength: 320 },
    previousRole: { type: String, enum: ["admin", "member"] },
    role: { type: String, enum: ["admin", "member"] },
    assigneeUserId: { type: String, trim: true },
    assigneeEmail: { type: String, trim: true, lowercase: true, maxlength: 320 },
    previousAssigneeUserId: { type: String, trim: true },
    previousAssigneeEmail: { type: String, trim: true, lowercase: true, maxlength: 320 },
    approvalRequestId: { type: String, trim: true },
    approvalAction: { type: String, enum: ["comparison_handoff_to_portfolio"] },
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected", "cancelled"] },
    approvalRequesterEmail: { type: String, trim: true, lowercase: true, maxlength: 320 },
    approvalReviewerEmail: { type: String, trim: true, lowercase: true, maxlength: 320 },
    decisionOutcomeId: { type: String, trim: true },
    decisionOutcomeStatus: { type: String, enum: ["approved", "declined", "deferred", "archived"] },
    decisionOutcomeResolverEmail: { type: String, trim: true, lowercase: true, maxlength: 320 },
  },
  { _id: false, versionKey: false },
);

const workspaceActivitySchema = new Schema<WorkspaceActivityRecord>(
  {
    workspaceId: { type: String, required: true, trim: true, index: true },
    actorUserId: { type: String, required: true, trim: true, index: true },
    actorEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
    category: {
      type: String,
      enum: ["data", "decisions", "portfolio", "members", "responsibility", "approvals"],
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        "dataset_uploaded",
        "dataset_scoring_requested",
        "dataset_refresh_requested",
        "dataset_scoring_rate_limited",
        "dataset_refresh_rate_limited",
        "comparison_decision_changed",
        "comparison_handoff_to_watchlist",
        "comparison_handoff_to_portfolio",
        "portfolio_status_changed",
        "workspace_member_added",
        "workspace_member_role_changed",
        "workspace_member_removed",
        "entity_assigned",
        "entity_reassigned",
        "entity_assignment_cleared",
        "approval_requested",
        "approval_approved",
        "approval_rejected",
        "approval_cancelled",
        "decision_outcome_resolved",
      ],
      required: true,
      index: true,
    },
    relatedEntityType: {
      type: String,
      enum: ["dataset", "job", "comparison_item", "watchlist_item", "portfolio_item", "workspace_membership"],
      required: true,
    },
    relatedEntityId: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true, maxlength: 280 },
    metadata: { type: workspaceActivityMetadataSchema },
    occurredAt: { type: Date, required: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

workspaceActivitySchema.index({ workspaceId: 1, occurredAt: -1, _id: -1 });
workspaceActivitySchema.index({ workspaceId: 1, category: 1, occurredAt: -1, _id: -1 });

export const WorkspaceActivityModel: Model<WorkspaceActivityRecord> =
  mongoose.models.WorkspaceActivity ??
  mongoose.model<WorkspaceActivityRecord>("WorkspaceActivity", workspaceActivitySchema);
