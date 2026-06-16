import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export type DecisionOutcomeTargetEntityTypeRecord = "comparison_item";
export type DecisionOutcomeStatusRecord = "approved" | "declined" | "deferred" | "archived";
export type DecisionOutcomeResolverRoleRecord = "owner" | "admin" | "member";

export interface DecisionOutcomeRecord {
  workspaceId: string;
  targetEntityType: DecisionOutcomeTargetEntityTypeRecord;
  targetEntityId: string;
  status: DecisionOutcomeStatusRecord;
  resolverUserId: string;
  resolverEmail: string;
  resolverRole: DecisionOutcomeResolverRoleRecord;
  note: string;
  resolvedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type DecisionOutcomeDocument = HydratedDocument<DecisionOutcomeRecord>;

const decisionOutcomeSchema = new Schema<DecisionOutcomeRecord>(
  {
    workspaceId: { type: String, required: true, trim: true, index: true },
    targetEntityType: { type: String, required: true, enum: ["comparison_item"] },
    targetEntityId: { type: String, required: true, trim: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ["approved", "declined", "deferred", "archived"],
      index: true,
    },
    resolverUserId: { type: String, required: true, trim: true, index: true },
    resolverEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
    resolverRole: { type: String, required: true, enum: ["owner", "admin", "member"] },
    note: { type: String, required: true, trim: true, maxlength: 1000 },
    resolvedAt: { type: Date, required: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

decisionOutcomeSchema.index(
  { workspaceId: 1, targetEntityType: 1, targetEntityId: 1 },
  { unique: true },
);
decisionOutcomeSchema.index({ workspaceId: 1, status: 1, resolvedAt: -1, _id: -1 });

export const DecisionOutcomeModel: Model<DecisionOutcomeRecord> =
  mongoose.models.DecisionOutcome ??
  mongoose.model<DecisionOutcomeRecord>("DecisionOutcome", decisionOutcomeSchema);
