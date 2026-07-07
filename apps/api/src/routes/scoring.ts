import { Router } from "express";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { requireAuth } from "../middleware/auth.js";
import {
  createFixedWindowRateLimit,
  type FixedWindowRateLimitOptions,
} from "../middleware/rate-limit.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import type { ScoringService } from "../scoring/scoring-service.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";
import {
  recordWorkspaceActivitySafely,
  type WorkspaceActivityService,
} from "../workspace-activity/workspace-activity-service.js";

export function createScoringRouter(
  authService: AuthService,
  scoringService: ScoringService,
  workspaceService: WorkspaceService,
  activityService: WorkspaceActivityService,
  scoringRequestLimit: FixedWindowRateLimitOptions,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");
  const requireWorkspaceWrite = requireWorkspaceAccess(workspaceService, "write");
  const limitScoringRequests = (requestKind: "score" | "refresh") =>
    createFixedWindowRateLimit({
      ...scoringRequestLimit,
      keyPrefix: "scoring",
      onLimit: async (request, context) => {
        if (!request.auth || !request.workspace) {
          return;
        }

        const datasetId = request.params.datasetId;
        if (typeof datasetId !== "string") {
          return;
        }

        await recordWorkspaceActivitySafely(activityService, {
          workspaceId: request.workspace.workspaceId,
          actorUserId: request.auth.userId,
          eventType: requestKind === "score" ? "dataset_scoring_rate_limited" : "dataset_refresh_rate_limited",
          relatedEntityType: "dataset",
          relatedEntityId: datasetId,
          metadata: {
            datasetId,
            requestKind,
            rateLimitRetryAfterMs: context.retryAfterMs,
          },
        });
      },
    });

  router.post("/:datasetId/score", requireAuthenticatedUser, requireWorkspaceWrite, limitScoringRequests("score"), async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const datasetId = request.params.datasetId;
      if (typeof datasetId !== "string") {
        throw new ApiError(400, "dataset_invalid_id", "Dataset id is invalid.");
      }

      const result = await scoringService.scoreDataset(datasetId, request.workspace.tenantUserId);
      await recordWorkspaceActivitySafely(activityService, {
        workspaceId: request.workspace.workspaceId,
        actorUserId: request.auth.userId,
        eventType: "dataset_scoring_requested",
        relatedEntityType: "job",
        relatedEntityId: result.job.id,
        metadata: {
          datasetId: result.datasetId,
          jobId: result.job.id,
          requestKind: "score",
        },
      });
      response.status(202).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:datasetId/refresh", requireAuthenticatedUser, requireWorkspaceWrite, limitScoringRequests("refresh"), async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const datasetId = request.params.datasetId;
      if (typeof datasetId !== "string") {
        throw new ApiError(400, "dataset_invalid_id", "Dataset id is invalid.");
      }

      const result = await scoringService.refreshDataset(datasetId, request.workspace.tenantUserId);
      if (result.requestStatus === "queued") {
        await recordWorkspaceActivitySafely(activityService, {
          workspaceId: request.workspace.workspaceId,
          actorUserId: request.auth.userId,
          eventType: "dataset_refresh_requested",
          relatedEntityType: "job",
          relatedEntityId: result.job.id,
          metadata: {
            datasetId: result.datasetId,
            jobId: result.job.id,
            requestKind: "refresh",
          },
        });
      }
      response.status(202).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:datasetId/scoring-status", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const datasetId = request.params.datasetId;
      if (typeof datasetId !== "string") {
        throw new ApiError(400, "dataset_invalid_id", "Dataset id is invalid.");
      }

      response.status(200).json(await scoringService.getScoringStatus(datasetId, request.workspace.tenantUserId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:datasetId/scores", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const datasetId = request.params.datasetId;
      if (typeof datasetId !== "string") {
        throw new ApiError(400, "dataset_invalid_id", "Dataset id is invalid.");
      }

      response.status(200).json(await scoringService.listScores(datasetId, request.workspace.tenantUserId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
