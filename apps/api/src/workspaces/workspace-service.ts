import mongoose from "mongoose";
import type {
  AddWorkspaceMemberResponse,
  CurrentWorkspaceResponse,
  DeactivateWorkspaceMemberResponse,
  UpdateWorkspaceMemberRoleResponse,
  WorkspaceListResponse,
  WorkspaceMemberResponse,
  WorkspaceMembersResponse,
  WorkspacePermissions,
  WorkspaceResponse,
  WorkspaceRole,
} from "@tax-lien/types";
import type { UserStore } from "../auth/user-store.js";
import { ApiError } from "../errors/api-error.js";
import type {
  StoredWorkspace,
  StoredWorkspaceMembership,
  WorkspaceMembershipStore,
  WorkspaceStore,
} from "./workspace-store.js";

export interface WorkspaceAccessContext {
  workspaceId: string;
  workspaceName: string;
  tenantUserId: string;
  membershipId: string;
  role: WorkspaceRole;
  isDefault: boolean;
}

export class WorkspaceService {
  public constructor(
    private readonly workspaceStore: WorkspaceStore,
    private readonly membershipStore: WorkspaceMembershipStore,
    private readonly userStore: UserStore,
  ) {}

  public async resolveContext(userId: string, requestedWorkspaceId?: string): Promise<WorkspaceAccessContext> {
    let memberships = await this.membershipStore.listForUser(userId);
    if (memberships.length === 0) {
      await this.bootstrapPersonalWorkspace(userId);
      memberships = await this.membershipStore.listForUser(userId);
    }

    const membership = requestedWorkspaceId
      ? await this.membershipStore.findForUserInWorkspace(userId, requestedWorkspaceId)
      : memberships.find((candidate) => candidate.isDefault) ?? memberships[0] ?? null;

    if (!membership) {
      throw new ApiError(403, "workspace_access_denied", "You do not have access to this workspace.");
    }

    const workspace = await this.workspaceStore.findById(membership.workspaceId);
    if (!workspace) {
      throw new ApiError(403, "workspace_access_denied", "You do not have access to this workspace.");
    }

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      tenantUserId: workspace.ownerUserId,
      membershipId: membership.id,
      role: membership.role,
      isDefault: membership.isDefault,
    };
  }

  public async listWorkspaces(userId: string, requestedWorkspaceId?: string): Promise<WorkspaceListResponse> {
    const current = await this.resolveContext(userId, requestedWorkspaceId);
    const memberships = await this.membershipStore.listForUser(userId);
    const workspaces = await Promise.all(
      memberships.map(async (membership) => {
        const workspace = await this.workspaceStore.findById(membership.workspaceId);
        return workspace ? this.toWorkspaceResponse(workspace, membership) : null;
      }),
    );

    return {
      workspaces: workspaces.filter((workspace): workspace is WorkspaceResponse => workspace !== null),
      currentWorkspaceId: current.workspaceId,
    };
  }

  public async getCurrentWorkspace(
    userId: string,
    requestedWorkspaceId?: string,
  ): Promise<CurrentWorkspaceResponse> {
    const context = await this.resolveContext(userId, requestedWorkspaceId);
    const workspace = await this.workspaceStore.findById(context.workspaceId);
    const membership = await this.membershipStore.findForUserInWorkspace(userId, context.workspaceId);
    if (!workspace || !membership) {
      throw new ApiError(403, "workspace_access_denied", "You do not have access to this workspace.");
    }

    return { workspace: await this.toWorkspaceResponse(workspace, membership) };
  }

  public async listMembers(context: WorkspaceAccessContext): Promise<WorkspaceMembersResponse> {
    const memberships = await this.membershipStore.listForWorkspace(context.workspaceId);
    return { members: await Promise.all(memberships.map((member) => this.toMemberResponse(member))) };
  }

  public async addMember(
    actorUserId: string,
    context: WorkspaceAccessContext,
    email: string,
    role: Exclude<WorkspaceRole, "owner">,
  ): Promise<AddWorkspaceMemberResponse> {
    this.assertCanManageMembers(context);
    if (context.role === "admin" && role !== "member") {
      throw new ApiError(403, "workspace_role_forbidden", "Only the workspace owner can add administrators.");
    }

    const user = await this.userStore.findByEmail(email.trim().toLowerCase());
    if (!user) {
      throw new ApiError(
        404,
        "workspace_member_user_not_found",
        "The user must register before they can be added to this workspace.",
      );
    }

    await this.bootstrapPersonalWorkspace(user.id);

    if (await this.membershipStore.findForUserInWorkspace(user.id, context.workspaceId)) {
      throw new ApiError(409, "workspace_member_exists", "This user is already a workspace member.");
    }

    const member = await this.membershipStore.createMembership({
      workspaceId: context.workspaceId,
      userId: user.id,
      role,
      isDefault: false,
      addedByUserId: actorUserId,
      joinedAt: new Date(),
    });

    return { member: await this.toMemberResponse(member) };
  }

  public async updateMemberRole(
    context: WorkspaceAccessContext,
    membershipId: string,
    role: Exclude<WorkspaceRole, "owner">,
  ): Promise<UpdateWorkspaceMemberRoleResponse> {
    if (!mongoose.Types.ObjectId.isValid(membershipId)) {
      throw new ApiError(400, "workspace_invalid_membership_id", "Workspace membership id is invalid.");
    }

    if (context.role !== "owner") {
      throw new ApiError(403, "workspace_role_forbidden", "Only the workspace owner can change member roles.");
    }

    const existing = await this.membershipStore.findByIdInWorkspace(membershipId, context.workspaceId);
    if (!existing || existing.role === "owner") {
      throw new ApiError(404, "workspace_member_not_found", "Workspace member was not found.");
    }

    const updated = await this.membershipStore.updateRole(membershipId, context.workspaceId, role);
    if (!updated) {
      throw new ApiError(404, "workspace_member_not_found", "Workspace member was not found.");
    }

    return { member: await this.toMemberResponse(updated) };
  }

  public async deactivateMember(
    actorUserId: string,
    context: WorkspaceAccessContext,
    membershipId: string,
  ): Promise<DeactivateWorkspaceMemberResponse> {
    if (!mongoose.Types.ObjectId.isValid(membershipId)) {
      throw new ApiError(400, "workspace_invalid_membership_id", "Workspace membership id is invalid.");
    }

    this.assertCanManageMembers(context);
    const existing = await this.membershipStore.findByIdInWorkspace(membershipId, context.workspaceId);
    if (!existing) {
      throw new ApiError(404, "workspace_member_not_found", "Workspace member was not found.");
    }
    if (existing.role === "owner") {
      throw new ApiError(
        409,
        "workspace_owner_protected",
        "The workspace owner cannot be removed. Ownership transfer is not available.",
      );
    }
    if (context.role === "admin" && existing.role !== "member") {
      throw new ApiError(403, "workspace_role_forbidden", "Administrators can remove regular members only.");
    }

    const deactivated = await this.membershipStore.deactivateMembership(
      membershipId,
      context.workspaceId,
      actorUserId,
      new Date(),
    );
    if (!deactivated) {
      throw new ApiError(404, "workspace_member_not_found", "Workspace member was not found.");
    }

    return { member: await this.toMemberResponse(deactivated) };
  }

  private async bootstrapPersonalWorkspace(userId: string): Promise<void> {
    const user = await this.userStore.findById(userId);
    if (!user) {
      throw new ApiError(401, "auth_user_not_found", "Authenticated user no longer exists.");
    }

    const localPart = user.email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Personal";
    const workspace = await this.workspaceStore.findOrCreateOwnedWorkspace({
      ownerUserId: user.id,
      name: `${titleCase(localPart)} Workspace`,
    });

    await this.membershipStore.findOrCreateOwnerMembership({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
      isDefault: true,
      addedByUserId: user.id,
      joinedAt: user.createdAt,
    });
  }

  private async toWorkspaceResponse(
    workspace: StoredWorkspace,
    membership: StoredWorkspaceMembership,
  ): Promise<WorkspaceResponse> {
    return {
      id: workspace.id,
      name: workspace.name,
      role: membership.role,
      isDefault: membership.isDefault,
      memberCount: (await this.membershipStore.listForWorkspace(workspace.id)).length,
      permissions: permissionsForRole(membership.role),
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    };
  }

  private async toMemberResponse(membership: StoredWorkspaceMembership): Promise<WorkspaceMemberResponse> {
    const user = await this.userStore.findById(membership.userId);
    if (!user) {
      throw new ApiError(500, "workspace_member_user_missing", "Workspace member record is incomplete.");
    }

    return {
      id: membership.id,
      userId: membership.userId,
      email: user.email,
      role: membership.role,
      status: membership.status,
      isDefault: membership.isDefault,
      joinedAt: membership.joinedAt.toISOString(),
      createdAt: membership.createdAt.toISOString(),
      updatedAt: membership.updatedAt.toISOString(),
    };
  }

  private assertCanManageMembers(context: WorkspaceAccessContext): void {
    if (context.role !== "owner" && context.role !== "admin") {
      throw new ApiError(403, "workspace_role_forbidden", "Your workspace role cannot manage members.");
    }
  }
}

export function permissionsForRole(role: WorkspaceRole): WorkspacePermissions {
  return {
    canReadSharedData: true,
    canManageSharedData: role === "owner" || role === "admin",
    canManageMembers: role === "owner" || role === "admin",
    canRemoveMembers: role === "owner" || role === "admin",
    canManageRoles: role === "owner",
    canRequestApprovals: true,
    canReviewApprovals: role === "owner" || role === "admin",
    canExecuteSensitiveActions: role === "owner",
  };
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
