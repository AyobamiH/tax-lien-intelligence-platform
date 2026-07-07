import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { WorkspaceAssignmentEntityTypeRecord } from "./workspace-assignment.js";

export type FollowUpTargetEntityTypeRecord = Exclude<WorkspaceAssignmentEntityTypeRecord, "dataset">;
export type FollowUpReminderStateRecord = "none" | "due" | "overdue";

export interface FollowUpRecord {
  workspaceId: string;
  targetEntityType: FollowUpTargetEntityTypeRecord;
  targetEntityId: string;
  dueAt: Date;
  note?: string;
  createdByUserId: string;
  updatedByUserId: string;
  clearedAt?: Date;
  clearedByUserId?: string;
  completedAt?: Date;
  completedByUserId?: string;
  snoozedAt?: Date;
  snoozedByUserId?: string;
  previousDueAt?: Date;
  lastReminderAt?: Date;
  lastReminderState: FollowUpReminderStateRecord;
  createdAt: Date;
  updatedAt: Date;
}

export type FollowUpDocument = HydratedDocument<FollowUpRecord>;

const followUpSchema = new Schema<FollowUpRecord>(
  {
    workspaceId: { type: String, required: true, trim: true, index: true },
    targetEntityType: {
      type: String,
      enum: ["comparison_item", "watchlist_item", "portfolio_item"],
      required: true,
    },
    targetEntityId: { type: String, required: true, trim: true },
    dueAt: { type: Date, required: true, index: true },
    note: { type: String, trim: true, maxlength: 500 },
    createdByUserId: { type: String, required: true, trim: true, index: true },
    updatedByUserId: { type: String, required: true, trim: true },
    clearedAt: { type: Date, index: true },
    clearedByUserId: { type: String, trim: true },
    completedAt: { type: Date, index: true },
    completedByUserId: { type: String, trim: true },
    snoozedAt: { type: Date },
    snoozedByUserId: { type: String, trim: true },
    previousDueAt: { type: Date },
    lastReminderAt: { type: Date },
    lastReminderState: {
      type: String,
      enum: ["none", "due", "overdue"],
      required: true,
      default: "none",
    },
  },
  { timestamps: true, versionKey: false },
);

followUpSchema.index(
  { workspaceId: 1, targetEntityType: 1, targetEntityId: 1 },
  { unique: true },
);
followUpSchema.index({ workspaceId: 1, clearedAt: 1, dueAt: 1, _id: 1 });
followUpSchema.index({ workspaceId: 1, completedAt: 1, dueAt: 1, _id: 1 });

export const FollowUpModel: Model<FollowUpRecord> =
  mongoose.models.FollowUp ?? mongoose.model<FollowUpRecord>("FollowUp", followUpSchema);
