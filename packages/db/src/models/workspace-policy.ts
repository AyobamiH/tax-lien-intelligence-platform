import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export interface WorkspacePolicyRulesRecord {
  requireAssignmentBeforeComparisonHandoff: boolean;
  requireChecklistBeforeComparisonHandoff: boolean;
  requireApprovalForComparisonPortfolio: boolean;
}

export interface WorkspacePolicyRecord {
  workspaceId: string;
  rules: WorkspacePolicyRulesRecord;
  updatedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkspacePolicyDocument = HydratedDocument<WorkspacePolicyRecord>;

const workspacePolicyRulesSchema = new Schema<WorkspacePolicyRulesRecord>(
  {
    requireAssignmentBeforeComparisonHandoff: {
      type: Boolean,
      required: true,
      default: false,
    },
    requireChecklistBeforeComparisonHandoff: {
      type: Boolean,
      required: true,
      default: false,
    },
    requireApprovalForComparisonPortfolio: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { _id: false },
);

const workspacePolicySchema = new Schema<WorkspacePolicyRecord>(
  {
    workspaceId: { type: String, required: true, trim: true, unique: true },
    rules: {
      type: workspacePolicyRulesSchema,
      required: true,
      default: () => ({}),
    },
    updatedByUserId: { type: String, required: true, trim: true },
  },
  { timestamps: true, versionKey: false },
);

export const WorkspacePolicyModel: Model<WorkspacePolicyRecord> =
  mongoose.models.WorkspacePolicy ??
  mongoose.model<WorkspacePolicyRecord>("WorkspacePolicy", workspacePolicySchema);
