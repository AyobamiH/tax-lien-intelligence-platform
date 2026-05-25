import { Router } from "express";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { requireAuth } from "../middleware/auth.js";
import type { ScoringService } from "../scoring/scoring-service.js";

export function createScoringRouter(authService: AuthService, scoringService: ScoringService): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);

  router.post("/:datasetId/score", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const datasetId = request.params.datasetId;
      if (typeof datasetId !== "string") {
        throw new ApiError(400, "dataset_invalid_id", "Dataset id is invalid.");
      }

      response.status(200).json(await scoringService.scoreDataset(datasetId, request.auth.userId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:datasetId/scores", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const datasetId = request.params.datasetId;
      if (typeof datasetId !== "string") {
        throw new ApiError(400, "dataset_invalid_id", "Dataset id is invalid.");
      }

      response.status(200).json(await scoringService.listScores(datasetId, request.auth.userId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
