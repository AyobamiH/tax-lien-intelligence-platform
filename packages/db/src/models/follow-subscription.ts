import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { WorkspaceCommentEntityTypeRecord } from "./workspace-comment.js";

export type FollowTargetEntityTypeRecord = WorkspaceCommentEntityTypeRecord;

export interface FollowSubscriptionRecord {
  workspaceId: string;
  followerUserId: string;
  targetEntityType: FollowTargetEntityTypeRecord;
  targetEntityId: string;
  followedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type FollowSubscriptionDocument = HydratedDocument<FollowSubscriptionRecord>;

const followSubscriptionSchema = new Schema<FollowSubscriptionRecord>(
  {
    workspaceId: { type: String, required: true, trim: true, index: true },
    followerUserId: { type: String, required: true, trim: true, index: true },
    targetEntityType: {
      type: String,
      enum: ["dataset", "comparison_item", "watchlist_item", "portfolio_item"],
      required: true,
    },
    targetEntityId: { type: String, required: true, trim: true },
    followedAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false },
);

followSubscriptionSchema.index(
  {
    workspaceId: 1,
    followerUserId: 1,
    targetEntityType: 1,
    targetEntityId: 1,
  },
  { unique: true },
);
followSubscriptionSchema.index({ workspaceId: 1, followerUserId: 1, followedAt: -1, _id: -1 });
followSubscriptionSchema.index({ workspaceId: 1, targetEntityType: 1, targetEntityId: 1 });

export const FollowSubscriptionModel: Model<FollowSubscriptionRecord> =
  mongoose.models.FollowSubscription ??
  mongoose.model<FollowSubscriptionRecord>("FollowSubscription", followSubscriptionSchema);
