import { Router } from "express";
import type { Request } from "express";
import { z } from "zod";
import type { FollowUpTargetEntityType } from "@tax-lien/types";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import type { FollowUpService } from "../follow-ups/follow-up-service.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";

const targetSchema = z.object({
  entityType: z.enum(["comparison_item", "watchlist_item", "portfolio_item"]),
  entityId: z.string().min(1).max(128),
});

const upsertSchema = z.object({
  dueAt: z.string().min(1).max(80),
  note: z.string().max(500).optional().nullable(),
});

const snoozeSchema = upsertSchema;

export function createFollowUpRouter(
  authService: AuthService,
  workspaceService: WorkspaceService,
  followUpService: FollowUpService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");
  const requireWorkspaceWrite = requireWorkspaceAccess(workspaceService, "write");

  router.get("/queue", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      response.status(200).json(await followUpService.listQueue(request.workspace, request.auth.userId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:entityType/:entityId", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      const { entityType, entityId } = parseTarget(request);
      response.status(200).json(await followUpService.getState(requireWorkspace(request), entityType, entityId));
    } catch (error) {
      next(error);
    }
  });

  router.put("/:entityType/:entityId", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }
      const { entityType, entityId } = parseTarget(request);
      const parsed = upsertSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }
      const dueAt = new Date(parsed.data.dueAt);
      const result = await followUpService.upsert(
        requireWorkspace(request),
        request.auth.userId,
        entityType,
        entityId,
        {
          dueAt,
          ...(parsed.data.note ? { note: parsed.data.note } : {}),
        },
      );
      response.status(result.changed ? 200 : 200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:entityType/:entityId/complete", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }
      const { entityType, entityId } = parseTarget(request);
      response.status(200).json(
        await followUpService.complete(requireWorkspace(request), request.auth.userId, entityType, entityId),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/:entityType/:entityId/snooze", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }
      const { entityType, entityId } = parseTarget(request);
      const parsed = snoozeSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }
      const result = await followUpService.snooze(
        requireWorkspace(request),
        request.auth.userId,
        entityType,
        entityId,
        {
          dueAt: new Date(parsed.data.dueAt),
          ...(parsed.data.note ? { note: parsed.data.note } : {}),
        },
      );
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:entityType/:entityId", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }
      const { entityType, entityId } = parseTarget(request);
      response.status(200).json(
        await followUpService.clear(requireWorkspace(request), request.auth.userId, entityType, entityId),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function parseTarget(request: Request): {
  entityType: FollowUpTargetEntityType;
  entityId: string;
} {
  const parsed = targetSchema.safeParse(request.params);
  if (!parsed.success) {
    throw toValidationError();
  }
  return parsed.data;
}

function requireWorkspace(request: Request) {
  if (!request.workspace) {
    throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
  }
  return request.workspace;
}
