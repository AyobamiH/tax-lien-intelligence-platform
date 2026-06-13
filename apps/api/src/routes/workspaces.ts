import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import { parseRequestBody } from "../auth/validation.js";
import { ApiError } from "../errors/api-error.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";
import type { WorkspaceActivityCategory } from "@tax-lien/types";
import {
  recordWorkspaceActivitySafely,
  type WorkspaceActivityService,
} from "../workspace-activity/workspace-activity-service.js";

const memberRoleSchema = z.enum(["admin", "member"]);
const addMemberSchema = z.object({
  email: z.string().email().max(320),
  role: memberRoleSchema,
});
const updateMemberRoleSchema = z.object({ role: memberRoleSchema });
const activityQuerySchema = z.object({
  category: z.enum(["data", "decisions", "portfolio", "members", "responsibility"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export function createWorkspaceRouter(
  authService: AuthService,
  workspaceService: WorkspaceService,
  activityService: WorkspaceActivityService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");
  const requireMemberManagement = requireWorkspaceAccess(workspaceService, "manage_members");
  const requireMemberRemoval = requireWorkspaceAccess(workspaceService, "remove_members");
  const requireRoleManagement = requireWorkspaceAccess(workspaceService, "manage_roles");

  router.get("/", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }
      response.status(200).json(
        await workspaceService.listWorkspaces(
          request.auth.userId,
          request.header("x-workspace-id") || undefined,
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  router.get("/current", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }
      response.status(200).json(
        await workspaceService.getCurrentWorkspace(
          request.auth.userId,
          request.header("x-workspace-id") || undefined,
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  router.get("/current/members", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      response.status(200).json(await workspaceService.listMembers(request.workspace));
    } catch (error) {
      next(error);
    }
  });

  router.get("/current/activity", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      const parsed = activityQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        throw new ApiError(400, "workspace_activity_invalid_query", "Workspace activity query is invalid.");
      }
      response.status(200).json(
        await activityService.list(request.workspace.workspaceId, {
          ...(parsed.data.category
            ? { category: parsed.data.category as WorkspaceActivityCategory }
            : {}),
          ...(parsed.data.limit ? { limit: parsed.data.limit } : {}),
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/current/members",
    requireAuthenticatedUser,
    requireMemberManagement,
    async (request, response, next) => {
      try {
        if (!request.auth || !request.workspace) {
          throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
        }
        const payload = parseRequestBody(addMemberSchema, request.body);
        const result = await workspaceService.addMember(
          request.auth.userId,
          request.workspace,
          payload.email,
          payload.role,
        );
        await recordWorkspaceActivitySafely(activityService, {
          workspaceId: request.workspace.workspaceId,
          actorUserId: request.auth.userId,
          eventType: "workspace_member_added",
          relatedEntityType: "workspace_membership",
          relatedEntityId: result.member.id,
          metadata: {
            memberUserId: result.member.userId,
            memberEmail: result.member.email,
            role: result.member.role === "owner" ? "member" : result.member.role,
          },
        });
        response.status(201).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/current/members/:membershipId",
    requireAuthenticatedUser,
    requireRoleManagement,
    async (request, response, next) => {
      try {
        if (!request.auth || !request.workspace) {
          throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
        }
        const membershipId = request.params.membershipId;
        if (typeof membershipId !== "string") {
          throw new ApiError(400, "workspace_invalid_membership_id", "Workspace membership id is invalid.");
        }
        const payload = parseRequestBody(updateMemberRoleSchema, request.body);
        const members = await workspaceService.listMembers(request.workspace);
        const previousMember = members.members.find((member) => member.id === membershipId);
        const result = await workspaceService.updateMemberRole(request.workspace, membershipId, payload.role);
        if (previousMember && previousMember.role !== result.member.role && previousMember.role !== "owner") {
          await recordWorkspaceActivitySafely(activityService, {
            workspaceId: request.workspace.workspaceId,
            actorUserId: request.auth.userId,
            eventType: "workspace_member_role_changed",
            relatedEntityType: "workspace_membership",
            relatedEntityId: result.member.id,
            metadata: {
              memberUserId: result.member.userId,
              memberEmail: result.member.email,
              previousRole: previousMember.role,
              role: result.member.role === "owner" ? "member" : result.member.role,
            },
          });
        }
        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/current/members/:membershipId",
    requireAuthenticatedUser,
    requireMemberRemoval,
    async (request, response, next) => {
      try {
        if (!request.auth || !request.workspace) {
          throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
        }
        const membershipId = request.params.membershipId;
        if (typeof membershipId !== "string") {
          throw new ApiError(400, "workspace_invalid_membership_id", "Workspace membership id is invalid.");
        }
        const result = await workspaceService.deactivateMember(
          request.auth.userId,
          request.workspace,
          membershipId,
        );
        await recordWorkspaceActivitySafely(activityService, {
          workspaceId: request.workspace.workspaceId,
          actorUserId: request.auth.userId,
          eventType: "workspace_member_removed",
          relatedEntityType: "workspace_membership",
          relatedEntityId: result.member.id,
          metadata: {
            memberUserId: result.member.userId,
            memberEmail: result.member.email,
            role: result.member.role === "owner" ? "member" : result.member.role,
          },
        });
        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
