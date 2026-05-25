import { Router } from "express";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import type { InternalJobService } from "../jobs/internal-job-service.js";
import { requireAuth } from "../middleware/auth.js";

export function createInternalJobRouter(authService: AuthService, internalJobService: InternalJobService): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);

  router.get("/:jobId", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const jobId = request.params.jobId;
      if (typeof jobId !== "string") {
        throw new ApiError(400, "job_invalid_id", "Job id is invalid.");
      }

      response.status(200).json(await internalJobService.getJob(request.auth.userId, jobId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
