import { Router } from "express";
import type { Request } from "express";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import type { WorkspaceAssignmentService } from "../workspace-assignments/workspace-assignment-service.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";

const entityTypeSchema = z.enum(["dataset", "comparison_item", "watchlist_item", "portfolio_item"]);
const assignSchema = z.object({ assigneeUserId: z.string().min(1).max(120) });

export function createWorkspaceAssignmentRouter(
  authService: AuthService,
  workspaceService: WorkspaceService,
  assignmentService: WorkspaceAssignmentService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");
  const requireWorkspaceWrite = requireWorkspaceAccess(workspaceService, "write");

  router.get("/mine", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      response.status(200).json(await assignmentService.listMine(request.workspace, request.auth.userId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:entityType/:entityId", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      const { entityType, entityId } = parseTarget(request);
      response.status(200).json(await assignmentService.get(requireContext(request), entityType, entityId));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:entityType/:entityId", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      const { entityType, entityId } = parseTarget(request);
      const parsed = assignSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }
      response.status(200).json(
        await assignmentService.assign(
          requireContext(request),
          request.auth.userId,
          entityType,
          entityId,
          parsed.data.assigneeUserId,
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:entityType/:entityId", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      const { entityType, entityId } = parseTarget(request);
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }
      response.status(200).json(
        await assignmentService.clear(requireContext(request), request.auth.userId, entityType, entityId),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function requireContext(request: Request) {
  if (!request.workspace) {
    throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
  }
  return request.workspace;
}

function parseTarget(request: Request) {
  const entityType = entityTypeSchema.safeParse(request.params.entityType);
  if (!entityType.success || typeof request.params.entityId !== "string") {
    throw toValidationError();
  }
  return { entityType: entityType.data, entityId: request.params.entityId };
}
