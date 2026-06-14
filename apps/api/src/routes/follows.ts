import { Router } from "express";
import { z } from "zod";
import type { FollowTargetEntityType } from "@tax-lien/types";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import type { FollowService } from "../follows/follow-service.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";

const targetSchema = z.object({
  entityType: z.enum(["dataset", "comparison_item", "watchlist_item", "portfolio_item"]),
  entityId: z.string().min(1).max(128),
});

export function createFollowRouter(
  authService: AuthService,
  workspaceService: WorkspaceService,
  followService: FollowService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");

  router.get("/", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      response.status(200).json(
        await followService.listMine(request.workspace, request.auth.userId),
      );
    } catch (error) {
      next(error);
    }
  });

  router.get("/:entityType/:entityId", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      const target = parseTarget(request.params);
      response.status(200).json(
        await followService.getState(
          request.workspace,
          request.auth.userId,
          target.entityType,
          target.entityId,
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  router.put("/:entityType/:entityId", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      const target = parseTarget(request.params);
      const result = await followService.follow(
        request.workspace,
        request.auth.userId,
        target.entityType,
        target.entityId,
      );
      response.status(result.alreadyFollowing ? 200 : 201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:entityType/:entityId", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      const target = parseTarget(request.params);
      response.status(200).json(
        await followService.unfollow(
          request.workspace,
          request.auth.userId,
          target.entityType,
          target.entityId,
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function parseTarget(params: unknown): {
  entityType: FollowTargetEntityType;
  entityId: string;
} {
  const parsed = targetSchema.safeParse(params);
  if (!parsed.success) {
    throw toValidationError();
  }
  return {
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
  };
}
