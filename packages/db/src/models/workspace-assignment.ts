import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { WorkspaceCommentEntityTypeRecord } from "./workspace-comment.js";

export type WorkspaceAssignmentEntityTypeRecord = WorkspaceCommentEntityTypeRecord;

export interface WorkspaceAssignmentRecord {
  workspaceId: string;
  relatedEntityType: WorkspaceAssignmentEntityTypeRecord;
  relatedEntityId: string;
  assigneeUserId: string;
  assignedByUserId: string;
  assignedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkspaceAssignmentDocument = HydratedDocument<WorkspaceAssignmentRecord>;

const workspaceAssignmentSchema = new Schema<WorkspaceAssignmentRecord>(
  {
    workspaceId: { type: String, required: true, trim: true, index: true },
    relatedEntityType: {
      type: String,
      enum: ["dataset", "comparison_item", "watchlist_item", "portfolio_item"],
      required: true,
    },
    relatedEntityId: { type: String, required: true, trim: true },
    assigneeUserId: { type: String, required: true, trim: true, index: true },
    assignedByUserId: { type: String, required: true, trim: true },
    assignedAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false },
);

workspaceAssignmentSchema.index(
  { workspaceId: 1, relatedEntityType: 1, relatedEntityId: 1 },
  { unique: true },
);
workspaceAssignmentSchema.index({ workspaceId: 1, assigneeUserId: 1, updatedAt: -1 });

export const WorkspaceAssignmentModel: Model<WorkspaceAssignmentRecord> =
  mongoose.models.WorkspaceAssignment ??
  mongoose.model<WorkspaceAssignmentRecord>("WorkspaceAssignment", workspaceAssignmentSchema);
