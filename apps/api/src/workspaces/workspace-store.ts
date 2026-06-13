import {
  WorkspaceMembershipModel,
  WorkspaceModel,
  type WorkspaceDocument,
  type WorkspaceMembershipDocument,
} from "@tax-lien/db";
import type { WorkspaceMembershipStatus, WorkspaceRole } from "@tax-lien/types";

export interface StoredWorkspace {
  id: string;
  name: string;
  ownerUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredWorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  status: WorkspaceMembershipStatus;
  isDefault: boolean;
  addedByUserId: string;
  joinedAt: Date;
  deactivatedByUserId?: string;
  deactivatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkspaceInput {
  name: string;
  ownerUserId: string;
}

export interface CreateWorkspaceMembershipInput {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  isDefault: boolean;
  addedByUserId: string;
  joinedAt: Date;
}

export interface WorkspaceStore {
  findOrCreateOwnedWorkspace(input: CreateWorkspaceInput): Promise<StoredWorkspace>;
  findById(workspaceId: string): Promise<StoredWorkspace | null>;
}

export interface WorkspaceMembershipStore {
  createMembership(input: CreateWorkspaceMembershipInput): Promise<StoredWorkspaceMembership>;
  findOrCreateOwnerMembership(input: CreateWorkspaceMembershipInput): Promise<StoredWorkspaceMembership>;
  findForUserInWorkspace(userId: string, workspaceId: string): Promise<StoredWorkspaceMembership | null>;
  findByIdInWorkspace(membershipId: string, workspaceId: string): Promise<StoredWorkspaceMembership | null>;
  listForUser(userId: string): Promise<StoredWorkspaceMembership[]>;
  listForWorkspace(workspaceId: string): Promise<StoredWorkspaceMembership[]>;
  countForUser(userId: string): Promise<number>;
  updateRole(
    membershipId: string,
    workspaceId: string,
    role: Exclude<WorkspaceRole, "owner">,
  ): Promise<StoredWorkspaceMembership | null>;
  deactivateMembership(
    membershipId: string,
    workspaceId: string,
    deactivatedByUserId: string,
    deactivatedAt: Date,
  ): Promise<StoredWorkspaceMembership | null>;
}

export class MongoWorkspaceStore implements WorkspaceStore {
  public async findOrCreateOwnedWorkspace(input: CreateWorkspaceInput): Promise<StoredWorkspace> {
    const document = await WorkspaceModel.findOneAndUpdate(
      { ownerUserId: input.ownerUserId },
      { $setOnInsert: input },
      { upsert: true, new: true },
    ).exec();

    return mapWorkspace(document);
  }

  public async findById(workspaceId: string): Promise<StoredWorkspace | null> {
    const document = await WorkspaceModel.findById(workspaceId).exec();
    return document ? mapWorkspace(document) : null;
  }
}

export class MongoWorkspaceMembershipStore implements WorkspaceMembershipStore {
  public async createMembership(input: CreateWorkspaceMembershipInput): Promise<StoredWorkspaceMembership> {
    const reactivated = await WorkspaceMembershipModel.findOneAndUpdate(
      { workspaceId: input.workspaceId, userId: input.userId, status: "inactive" },
      {
        $set: { ...input, status: "active" },
        $unset: { deactivatedByUserId: 1, deactivatedAt: 1 },
      },
      { new: true },
    ).exec();
    if (reactivated) {
      return mapMembership(reactivated);
    }

    const document = await WorkspaceMembershipModel.create({ ...input, status: "active" });
    return mapMembership(document);
  }

  public async findOrCreateOwnerMembership(
    input: CreateWorkspaceMembershipInput,
  ): Promise<StoredWorkspaceMembership> {
    const document = await WorkspaceMembershipModel.findOneAndUpdate(
      { workspaceId: input.workspaceId, userId: input.userId },
      {
        $setOnInsert: input,
        $set: { status: "active" },
        $unset: { deactivatedByUserId: 1, deactivatedAt: 1 },
      },
      { upsert: true, new: true },
    ).exec();

    return mapMembership(document);
  }

  public async findForUserInWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<StoredWorkspaceMembership | null> {
    const document = await WorkspaceMembershipModel.findOne({
      userId,
      workspaceId,
      status: "active",
    }).exec();
    return document ? mapMembership(document) : null;
  }

  public async findByIdInWorkspace(
    membershipId: string,
    workspaceId: string,
  ): Promise<StoredWorkspaceMembership | null> {
    const document = await WorkspaceMembershipModel.findOne({
      _id: membershipId,
      workspaceId,
      status: "active",
    }).exec();
    return document ? mapMembership(document) : null;
  }

  public async listForUser(userId: string): Promise<StoredWorkspaceMembership[]> {
    const documents = await WorkspaceMembershipModel.find({ userId, status: "active" })
      .sort({ isDefault: -1, joinedAt: 1 })
      .exec();
    return documents.map(mapMembership);
  }

  public async listForWorkspace(workspaceId: string): Promise<StoredWorkspaceMembership[]> {
    const documents = await WorkspaceMembershipModel.find({ workspaceId, status: "active" })
      .sort({ role: 1, joinedAt: 1 })
      .exec();
    return documents.map(mapMembership);
  }

  public async countForUser(userId: string): Promise<number> {
    return WorkspaceMembershipModel.countDocuments({ userId, status: "active" }).exec();
  }

  public async updateRole(
    membershipId: string,
    workspaceId: string,
    role: Exclude<WorkspaceRole, "owner">,
  ): Promise<StoredWorkspaceMembership | null> {
    const document = await WorkspaceMembershipModel.findOneAndUpdate(
      { _id: membershipId, workspaceId, role: { $ne: "owner" }, status: "active" },
      { $set: { role } },
      { new: true },
    ).exec();
    return document ? mapMembership(document) : null;
  }

  public async deactivateMembership(
    membershipId: string,
    workspaceId: string,
    deactivatedByUserId: string,
    deactivatedAt: Date,
  ): Promise<StoredWorkspaceMembership | null> {
    const document = await WorkspaceMembershipModel.findOneAndUpdate(
      { _id: membershipId, workspaceId, role: { $ne: "owner" }, status: "active" },
      {
        $set: {
          status: "inactive",
          isDefault: false,
          deactivatedByUserId,
          deactivatedAt,
        },
      },
      { new: true },
    ).exec();
    return document ? mapMembership(document) : null;
  }
}

function mapWorkspace(document: WorkspaceDocument): StoredWorkspace {
  return {
    id: document.id,
    name: document.name,
    ownerUserId: document.ownerUserId,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function mapMembership(document: WorkspaceMembershipDocument): StoredWorkspaceMembership {
  const membership: StoredWorkspaceMembership = {
    id: document.id,
    workspaceId: document.workspaceId,
    userId: document.userId,
    role: document.role,
    status: document.status,
    isDefault: document.isDefault,
    addedByUserId: document.addedByUserId,
    joinedAt: document.joinedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
  if (document.deactivatedByUserId) {
    membership.deactivatedByUserId = document.deactivatedByUserId;
  }
  if (document.deactivatedAt) {
    membership.deactivatedAt = document.deactivatedAt;
  }
  return membership;
}
