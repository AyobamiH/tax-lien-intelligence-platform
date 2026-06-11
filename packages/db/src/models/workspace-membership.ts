import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export const workspaceMembershipRoles = ["owner", "admin", "member"] as const;
export type WorkspaceMembershipRoleRecord = (typeof workspaceMembershipRoles)[number];
export type WorkspaceMembershipStatusRecord = "active";

export interface WorkspaceMembershipRecord {
  workspaceId: string;
  userId: string;
  role: WorkspaceMembershipRoleRecord;
  status: WorkspaceMembershipStatusRecord;
  isDefault: boolean;
  addedByUserId: string;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkspaceMembershipDocument = HydratedDocument<WorkspaceMembershipRecord>;

const workspaceMembershipSchema = new Schema<WorkspaceMembershipRecord>(
  {
    workspaceId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, required: true, enum: workspaceMembershipRoles },
    status: { type: String, required: true, enum: ["active"], default: "active" },
    isDefault: { type: Boolean, required: true, default: false },
    addedByUserId: { type: String, required: true },
    joinedAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

workspaceMembershipSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
workspaceMembershipSchema.index({ userId: 1, isDefault: -1, joinedAt: 1 });
workspaceMembershipSchema.index(
  { workspaceId: 1, role: 1 },
  { unique: true, partialFilterExpression: { role: "owner" } },
);

export const WorkspaceMembershipModel: Model<WorkspaceMembershipRecord> =
  mongoose.models.WorkspaceMembership ??
  mongoose.model<WorkspaceMembershipRecord>("WorkspaceMembership", workspaceMembershipSchema);
