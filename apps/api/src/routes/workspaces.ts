import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import { parseRequestBody } from "../auth/validation.js";
import { ApiError } from "../errors/api-error.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";

const memberRoleSchema = z.enum(["admin", "member"]);
const addMemberSchema = z.object({
  email: z.string().email().max(320),
  role: memberRoleSchema,
});
const updateMemberRoleSchema = z.object({ role: memberRoleSchema });

export function createWorkspaceRouter(authService: AuthService, workspaceService: WorkspaceService): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");
  const requireMemberManagement = requireWorkspaceAccess(workspaceService, "manage_members");
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
        response.status(201).json(
          await workspaceService.addMember(
            request.auth.userId,
            request.workspace,
            payload.email,
            payload.role,
          ),
        );
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
        if (!request.workspace) {
          throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
        }
        const membershipId = request.params.membershipId;
        if (typeof membershipId !== "string") {
          throw new ApiError(400, "workspace_invalid_membership_id", "Workspace membership id is invalid.");
        }
        const payload = parseRequestBody(updateMemberRoleSchema, request.body);
        response.status(200).json(
          await workspaceService.updateMemberRole(request.workspace, membershipId, payload.role),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
