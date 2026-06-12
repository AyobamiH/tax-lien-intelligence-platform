import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export type WorkspaceCommentEntityTypeRecord =
  | "dataset"
  | "comparison_item"
  | "watchlist_item"
  | "portfolio_item";

export interface WorkspaceCommentRecord {
  workspaceId: string;
  actorUserId: string;
  actorEmail: string;
  relatedEntityType: WorkspaceCommentEntityTypeRecord;
  relatedEntityId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkspaceCommentDocument = HydratedDocument<WorkspaceCommentRecord>;

const workspaceCommentSchema = new Schema<WorkspaceCommentRecord>(
  {
    workspaceId: { type: String, required: true, trim: true, index: true },
    actorUserId: { type: String, required: true, trim: true, index: true },
    actorEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
    relatedEntityType: {
      type: String,
      enum: ["dataset", "comparison_item", "watchlist_item", "portfolio_item"],
      required: true,
    },
    relatedEntityId: { type: String, required: true, trim: true },
    body: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true, versionKey: false },
);

workspaceCommentSchema.index({
  workspaceId: 1,
  relatedEntityType: 1,
  relatedEntityId: 1,
  createdAt: 1,
  _id: 1,
});

export const WorkspaceCommentModel: Model<WorkspaceCommentRecord> =
  mongoose.models.WorkspaceComment ??
  mongoose.model<WorkspaceCommentRecord>("WorkspaceComment", workspaceCommentSchema);
