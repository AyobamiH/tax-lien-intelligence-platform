import mongoose from "mongoose";
import type { WorkspaceRole } from "@tax-lien/types";
import type { UserStore } from "../../apps/api/src/auth/user-store.js";
import { WorkspaceService } from "../../apps/api/src/workspaces/workspace-service.js";
import type {
  CreateWorkspaceInput,
  CreateWorkspaceMembershipInput,
  StoredWorkspace,
  StoredWorkspaceMembership,
  WorkspaceMembershipStore,
  WorkspaceStore,
} from "../../apps/api/src/workspaces/workspace-store.js";

export class InMemoryWorkspaceStore implements WorkspaceStore {
  private readonly workspaces = new Map<string, StoredWorkspace>();

  public async findOrCreateOwnedWorkspace(input: CreateWorkspaceInput): Promise<StoredWorkspace> {
    const existing = [...this.workspaces.values()].find(
      (workspace) => workspace.ownerUserId === input.ownerUserId,
    );
    if (existing) {
      return existing;
    }

    const now = new Date();
    const workspace: StoredWorkspace = {
      id: new mongoose.Types.ObjectId().toString(),
      name: input.name,
      ownerUserId: input.ownerUserId,
      createdAt: now,
      updatedAt: now,
    };
    this.workspaces.set(workspace.id, workspace);
    return workspace;
  }

  public async findById(workspaceId: string): Promise<StoredWorkspace | null> {
    return this.workspaces.get(workspaceId) ?? null;
  }
}

export class InMemoryWorkspaceMembershipStore implements WorkspaceMembershipStore {
  private readonly memberships = new Map<string, StoredWorkspaceMembership>();

  public async createMembership(input: CreateWorkspaceMembershipInput): Promise<StoredWorkspaceMembership> {
    const duplicate = [...this.memberships.values()].find(
      (membership) => membership.workspaceId === input.workspaceId && membership.userId === input.userId,
    );
    if (duplicate) {
      throw new Error("duplicate workspace membership");
    }

    const now = new Date();
    const membership: StoredWorkspaceMembership = {
      id: new mongoose.Types.ObjectId().toString(),
      ...input,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.memberships.set(membership.id, membership);
    return membership;
  }

  public async findOrCreateOwnerMembership(
    input: CreateWorkspaceMembershipInput,
  ): Promise<StoredWorkspaceMembership> {
    return (
      (await this.findForUserInWorkspace(input.userId, input.workspaceId)) ??
      this.createMembership(input)
    );
  }

  public async findForUserInWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<StoredWorkspaceMembership | null> {
    return (
      [...this.memberships.values()].find(
        (membership) =>
          membership.userId === userId &&
          membership.workspaceId === workspaceId &&
          membership.status === "active",
      ) ?? null
    );
  }

  public async findByIdInWorkspace(
    membershipId: string,
    workspaceId: string,
  ): Promise<StoredWorkspaceMembership | null> {
    const membership = this.memberships.get(membershipId);
    return membership?.workspaceId === workspaceId && membership.status === "active" ? membership : null;
  }

  public async listForUser(userId: string): Promise<StoredWorkspaceMembership[]> {
    return [...this.memberships.values()]
      .filter((membership) => membership.userId === userId && membership.status === "active")
      .sort(
        (left, right) =>
          Number(right.isDefault) - Number(left.isDefault) ||
          left.joinedAt.getTime() - right.joinedAt.getTime(),
      );
  }

  public async listForWorkspace(workspaceId: string): Promise<StoredWorkspaceMembership[]> {
    return [...this.memberships.values()]
      .filter((membership) => membership.workspaceId === workspaceId && membership.status === "active")
      .sort((left, right) => left.joinedAt.getTime() - right.joinedAt.getTime());
  }

  public async countForUser(userId: string): Promise<number> {
    return (await this.listForUser(userId)).length;
  }

  public async updateRole(
    membershipId: string,
    workspaceId: string,
    role: Exclude<WorkspaceRole, "owner">,
  ): Promise<StoredWorkspaceMembership | null> {
    const membership = await this.findByIdInWorkspace(membershipId, workspaceId);
    if (!membership || membership.role === "owner") {
      return null;
    }
    const updated = { ...membership, role, updatedAt: new Date() };
    this.memberships.set(updated.id, updated);
    return updated;
  }
}

export function createInMemoryWorkspaceService(userStore: UserStore): WorkspaceService {
  return new WorkspaceService(
    new InMemoryWorkspaceStore(),
    new InMemoryWorkspaceMembershipStore(),
    userStore,
  );
}
