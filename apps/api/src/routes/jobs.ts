import { Router } from "express";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import type { InternalJobService } from "../jobs/internal-job-service.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";

export function createInternalJobRouter(
  authService: AuthService,
  internalJobService: InternalJobService,
  workspaceService: WorkspaceService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");

  router.get("/:jobId", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const jobId = request.params.jobId;
      if (typeof jobId !== "string") {
        throw new ApiError(400, "job_invalid_id", "Job id is invalid.");
      }

      response.status(200).json(await internalJobService.getJob(request.workspace.tenantUserId, jobId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
