import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export interface WorkspaceRecord {
  name: string;
  ownerUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkspaceDocument = HydratedDocument<WorkspaceRecord>;

const workspaceSchema = new Schema<WorkspaceRecord>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    ownerUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const WorkspaceModel: Model<WorkspaceRecord> =
  mongoose.models.Workspace ?? mongoose.model<WorkspaceRecord>("Workspace", workspaceSchema);
