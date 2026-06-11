import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import type { WatchlistService } from "../watchlist/watchlist-service.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";

const addWatchlistItemSchema = z.object({
  scoredRecordId: z.string().min(1).max(128),
});

export function createWatchlistRouter(
  authService: AuthService,
  watchlistService: WatchlistService,
  workspaceService: WorkspaceService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");
  const requireWorkspaceWrite = requireWorkspaceAccess(workspaceService, "write");

  router.post("/", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const parsed = addWatchlistItemSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }

      const result = await watchlistService.addItem(request.workspace.tenantUserId, parsed.data.scoredRecordId);
      response.status(result.alreadyExists ? 200 : 201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      response.status(200).json(await watchlistService.listItems(request.workspace.tenantUserId));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:watchlistItemId", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const watchlistItemId = request.params.watchlistItemId;
      if (typeof watchlistItemId !== "string") {
        throw new ApiError(400, "watchlist_invalid_item_id", "Watchlist item id is invalid.");
      }

      response.status(200).json(await watchlistService.deleteItem(request.workspace.tenantUserId, watchlistItemId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
