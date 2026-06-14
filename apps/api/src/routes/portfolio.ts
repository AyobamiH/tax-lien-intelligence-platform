import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import type { FollowService } from "../follows/follow-service.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import type { PortfolioService } from "../portfolio/portfolio-service.js";
import { portfolioStatuses } from "../portfolio/portfolio-service.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";
import {
  recordWorkspaceActivitySafely,
  type WorkspaceActivityService,
} from "../workspace-activity/workspace-activity-service.js";

const portfolioStatusSchema = z.enum(portfolioStatuses);

const addPortfolioItemSchema = z.object({
  scoredRecordId: z.string().min(1).max(128).optional(),
  watchlistItemId: z.string().min(1).max(128).optional(),
  status: portfolioStatusSchema.optional(),
});

const updatePortfolioItemSchema = z.object({
  status: portfolioStatusSchema,
});

export function createPortfolioRouter(
  authService: AuthService,
  portfolioService: PortfolioService,
  workspaceService: WorkspaceService,
  activityService: WorkspaceActivityService,
  followService: FollowService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");
  const requireWorkspaceWrite = requireWorkspaceAccess(workspaceService, "write");

  router.post("/", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const parsed = addPortfolioItemSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }

      const result = await portfolioService.addItem(request.workspace.tenantUserId, {
        ...(parsed.data.scoredRecordId ? { scoredRecordId: parsed.data.scoredRecordId } : {}),
        ...(parsed.data.watchlistItemId ? { watchlistItemId: parsed.data.watchlistItemId } : {}),
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
      });
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

      response.status(200).json(await portfolioService.listItems(request.workspace.tenantUserId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/summary", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      response.status(200).json(await portfolioService.getSummary(request.workspace.tenantUserId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:portfolioItemId", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const portfolioItemId = request.params.portfolioItemId;
      if (typeof portfolioItemId !== "string") {
        throw new ApiError(400, "portfolio_invalid_item_id", "Portfolio item id is invalid.");
      }

      response.status(200).json(await portfolioService.getItem(request.workspace.tenantUserId, portfolioItemId));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:portfolioItemId", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const portfolioItemId = request.params.portfolioItemId;
      if (typeof portfolioItemId !== "string") {
        throw new ApiError(400, "portfolio_invalid_item_id", "Portfolio item id is invalid.");
      }

      const parsed = updatePortfolioItemSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }

      const previous = await portfolioService.getItem(request.workspace.tenantUserId, portfolioItemId);
      const result = await portfolioService.updateStatus(
        request.workspace.tenantUserId,
        portfolioItemId,
        parsed.data.status,
      );
      if (previous.item.status !== result.item.status) {
        await recordWorkspaceActivitySafely(activityService, {
          workspaceId: request.workspace.workspaceId,
          actorUserId: request.auth.userId,
          eventType: "portfolio_status_changed",
          relatedEntityType: "portfolio_item",
          relatedEntityId: result.item.id,
          metadata: {
            datasetId: result.item.datasetId,
            previousStatus: previous.item.status,
            newStatus: result.item.status,
          },
        });
        try {
          await followService.notifyFollowers({
            workspaceId: request.workspace.workspaceId,
            actorUserId: request.auth.userId,
            targetEntityType: "portfolio_item",
            targetEntityId: result.item.id,
            changeType: "portfolio_status_changed",
          });
        } catch {
          // Portfolio status persistence is authoritative; follower alerts are best effort.
        }
      }
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:portfolioItemId", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const portfolioItemId = request.params.portfolioItemId;
      if (typeof portfolioItemId !== "string") {
        throw new ApiError(400, "portfolio_invalid_item_id", "Portfolio item id is invalid.");
      }

      response.status(200).json(await portfolioService.deleteItem(request.workspace.tenantUserId, portfolioItemId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
