import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { WorkspaceCommentEntityTypeRecord } from "./workspace-comment.js";

export interface DiscussionAttentionRecord {
  userId: string;
  workspaceId: string;
  relatedEntityType: WorkspaceCommentEntityTypeRecord;
  relatedEntityId: string;
  unreadCount: number;
  lastReadAt?: Date;
  latestCommentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type DiscussionAttentionDocument = HydratedDocument<DiscussionAttentionRecord>;

const discussionAttentionSchema = new Schema<DiscussionAttentionRecord>(
  {
    userId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, required: true, trim: true, index: true },
    relatedEntityType: {
      type: String,
      enum: ["dataset", "comparison_item", "watchlist_item", "portfolio_item"],
      required: true,
    },
    relatedEntityId: { type: String, required: true, trim: true },
    unreadCount: { type: Number, required: true, min: 0, default: 0 },
    lastReadAt: { type: Date },
    latestCommentAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

discussionAttentionSchema.index(
  {
    userId: 1,
    workspaceId: 1,
    relatedEntityType: 1,
    relatedEntityId: 1,
  },
  { unique: true },
);
discussionAttentionSchema.index({ userId: 1, workspaceId: 1, unreadCount: 1, updatedAt: -1 });

export const DiscussionAttentionModel: Model<DiscussionAttentionRecord> =
  mongoose.models.DiscussionAttention ??
  mongoose.model<DiscussionAttentionRecord>("DiscussionAttention", discussionAttentionSchema);
