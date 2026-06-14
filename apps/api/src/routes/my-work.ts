import { Router } from "express";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import type { MyWorkService } from "../my-work/my-work-service.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";

export function createMyWorkRouter(
  authService: AuthService,
  workspaceService: WorkspaceService,
  myWorkService: MyWorkService,
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
        await myWorkService.get(request.workspace, request.auth.userId),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
