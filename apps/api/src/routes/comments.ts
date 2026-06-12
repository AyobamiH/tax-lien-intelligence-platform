import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import type { WorkspaceCommentService } from "../workspace-comments/workspace-comment-service.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";

const workspaceCommentEntityTypeSchema = z.enum([
  "dataset",
  "comparison_item",
  "watchlist_item",
  "portfolio_item",
]);
const createWorkspaceCommentSchema = z.object({
  body: z.string(),
});

export function createWorkspaceCommentRouter(
  authService: AuthService,
  workspaceService: WorkspaceService,
  commentService: WorkspaceCommentService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");

  router.get("/:entityType/:entityId", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      const context = workspaceCommentContext(request);
      const entityType = parseEntityType(request.params.entityType);
      const entityId = parsePathId(request.params.entityId);
      response.status(200).json(await commentService.list(context, entityType, entityId));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:entityType/:entityId", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      const context = workspaceCommentContext(request);
      const entityType = parseEntityType(request.params.entityType);
      const entityId = parsePathId(request.params.entityId);
      const parsed = createWorkspaceCommentSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }
      response.status(201).json(await commentService.create(context, entityType, entityId, parsed.data.body));
    } catch (error) {
      next(error);
    }
  });

  router.patch(
    "/:entityType/:entityId/read",
    requireAuthenticatedUser,
    requireWorkspaceRead,
    async (request, response, next) => {
      try {
        const context = workspaceCommentContext(request);
        const entityType = parseEntityType(request.params.entityType);
        const entityId = parsePathId(request.params.entityId);
        response.status(200).json(await commentService.markRead(context, entityType, entityId));
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete("/:commentId", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      const commentId = parsePathId(request.params.commentId);
      response.status(200).json(
        await commentService.delete(request.workspace.workspaceId, request.auth.userId, commentId),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function workspaceCommentContext(request: Express.Request) {
  if (!request.auth || !request.workspace) {
    throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
  }
  return {
    workspaceId: request.workspace.workspaceId,
    tenantUserId: request.workspace.tenantUserId,
    actorUserId: request.auth.userId,
  };
}

function parseEntityType(value: string | string[] | undefined) {
  const parsed = workspaceCommentEntityTypeSchema.safeParse(value);
  if (!parsed.success) {
    throw toValidationError();
  }
  return parsed.data;
}

function parsePathId(value: string | string[] | undefined): string {
  if (typeof value !== "string") {
    throw toValidationError();
  }
  return value;
}
