import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export type ReviewChecklistTargetEntityTypeRecord =
  | "comparison_item"
  | "watchlist_item"
  | "portfolio_item";

export interface ReviewChecklistTemplateItemRecord {
  id: string;
  label: string;
  required: boolean;
  position: number;
}

export interface ReviewChecklistTemplateRecord {
  workspaceId: string;
  targetEntityType: ReviewChecklistTargetEntityTypeRecord;
  name: string;
  active: boolean;
  version: number;
  items: ReviewChecklistTemplateItemRecord[];
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewChecklistTemplateDocument =
  HydratedDocument<ReviewChecklistTemplateRecord>;

const reviewChecklistTemplateItemSchema =
  new Schema<ReviewChecklistTemplateItemRecord>(
    {
      id: { type: String, required: true, trim: true },
      label: { type: String, required: true, trim: true },
      required: { type: Boolean, required: true },
      position: { type: Number, required: true, min: 0 },
    },
    { _id: false },
  );

const reviewChecklistTemplateSchema =
  new Schema<ReviewChecklistTemplateRecord>(
    {
      workspaceId: { type: String, required: true, trim: true, index: true },
      targetEntityType: {
        type: String,
        enum: ["comparison_item", "watchlist_item", "portfolio_item"],
        required: true,
      },
      name: { type: String, required: true, trim: true },
      active: { type: Boolean, required: true, default: true },
      version: { type: Number, required: true, min: 1 },
      items: {
        type: [reviewChecklistTemplateItemSchema],
        required: true,
        validate: {
          validator: (items: ReviewChecklistTemplateItemRecord[]) =>
            items.length > 0 && items.length <= 20,
          message: "Checklist templates must contain between 1 and 20 items.",
        },
      },
      createdByUserId: { type: String, required: true, trim: true },
      updatedByUserId: { type: String, required: true, trim: true },
    },
    { timestamps: true, versionKey: false },
  );

reviewChecklistTemplateSchema.index(
  { workspaceId: 1, targetEntityType: 1 },
  { unique: true },
);

export const ReviewChecklistTemplateModel: Model<ReviewChecklistTemplateRecord> =
  mongoose.models.ReviewChecklistTemplate ??
  mongoose.model<ReviewChecklistTemplateRecord>(
    "ReviewChecklistTemplate",
    reviewChecklistTemplateSchema,
  );
