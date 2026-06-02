import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { ComparisonDecisionRecord, ComparisonSourceTypeRecord } from "./comparison-item.js";

export type DecisionHistoryRelatedEntityTypeRecord = "comparison_item";
export type DecisionHistoryEventTypeRecord = "comparison_decision_changed" | "comparison_note_changed";

export interface DecisionHistoryMetadataRecord {
  workspaceId?: "default";
  datasetId?: string;
  scoredRecordId?: string;
  sourceType?: ComparisonSourceTypeRecord;
}

export interface DecisionHistoryRecord {
  userId: string;
  relatedEntityType: DecisionHistoryRelatedEntityTypeRecord;
  relatedEntityId: string;
  eventType: DecisionHistoryEventTypeRecord;
  previousDecision?: ComparisonDecisionRecord;
  newDecision?: ComparisonDecisionRecord;
  previousNoteSnapshot?: string;
  noteSnapshot?: string;
  metadata?: DecisionHistoryMetadataRecord;
  createdAt: Date;
  updatedAt: Date;
}

export type DecisionHistoryDocument = HydratedDocument<DecisionHistoryRecord>;

const decisionHistoryMetadataSchema = new Schema<DecisionHistoryMetadataRecord>(
  {
    workspaceId: { type: String, enum: ["default"] },
    datasetId: { type: String, trim: true, index: true },
    scoredRecordId: { type: String, trim: true, index: true },
    sourceType: { type: String, enum: ["score", "watchlist", "portfolio"] },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const decisionHistorySchema = new Schema<DecisionHistoryRecord>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    relatedEntityType: {
      type: String,
      enum: ["comparison_item"],
      required: true,
      index: true,
    },
    relatedEntityId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ["comparison_decision_changed", "comparison_note_changed"],
      required: true,
      index: true,
    },
    previousDecision: {
      type: String,
      enum: ["undecided", "keep_reviewing", "move_forward", "rejected"],
    },
    newDecision: {
      type: String,
      enum: ["undecided", "keep_reviewing", "move_forward", "rejected"],
    },
    previousNoteSnapshot: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    noteSnapshot: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    metadata: {
      type: decisionHistoryMetadataSchema,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

decisionHistorySchema.index({ userId: 1, relatedEntityType: 1, relatedEntityId: 1, createdAt: -1 });
decisionHistorySchema.index({ userId: 1, createdAt: -1 });

export const DecisionHistoryModel: Model<DecisionHistoryRecord> =
  mongoose.models.DecisionHistory ??
  mongoose.model<DecisionHistoryRecord>("DecisionHistory", decisionHistorySchema);
