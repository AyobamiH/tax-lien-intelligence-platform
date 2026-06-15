import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { ReviewChecklistTargetEntityTypeRecord } from "./review-checklist-template.js";

export interface ReviewChecklistInstanceItemRecord {
  id: string;
  label: string;
  required: boolean;
  position: number;
  completed: boolean;
  completedByUserId?: string;
  completedByEmail?: string;
  completedAt?: Date;
}

export interface ReviewChecklistInstanceRecord {
  workspaceId: string;
  targetEntityType: ReviewChecklistTargetEntityTypeRecord;
  targetEntityId: string;
  templateId: string;
  templateName: string;
  templateVersion: number;
  items: ReviewChecklistInstanceItemRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewChecklistInstanceDocument =
  HydratedDocument<ReviewChecklistInstanceRecord>;

const reviewChecklistInstanceItemSchema =
  new Schema<ReviewChecklistInstanceItemRecord>(
    {
      id: { type: String, required: true, trim: true },
      label: { type: String, required: true, trim: true },
      required: { type: Boolean, required: true },
      position: { type: Number, required: true, min: 0 },
      completed: { type: Boolean, required: true, default: false },
      completedByUserId: { type: String, trim: true },
      completedByEmail: { type: String, trim: true, lowercase: true },
      completedAt: { type: Date },
    },
    { _id: false },
  );

const reviewChecklistInstanceSchema =
  new Schema<ReviewChecklistInstanceRecord>(
    {
      workspaceId: { type: String, required: true, trim: true, index: true },
      targetEntityType: {
        type: String,
        enum: ["comparison_item", "watchlist_item", "portfolio_item"],
        required: true,
      },
      targetEntityId: { type: String, required: true, trim: true },
      templateId: { type: String, required: true, trim: true },
      templateName: { type: String, required: true, trim: true },
      templateVersion: { type: Number, required: true, min: 1 },
      items: { type: [reviewChecklistInstanceItemSchema], required: true },
    },
    { timestamps: true, versionKey: false },
  );

reviewChecklistInstanceSchema.index(
  { workspaceId: 1, targetEntityType: 1, targetEntityId: 1 },
  { unique: true },
);

export const ReviewChecklistInstanceModel: Model<ReviewChecklistInstanceRecord> =
  mongoose.models.ReviewChecklistInstance ??
  mongoose.model<ReviewChecklistInstanceRecord>(
    "ReviewChecklistInstance",
    reviewChecklistInstanceSchema,
  );
