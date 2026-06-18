import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import type { OutcomeReviewService } from "../outcome-review/outcome-review-service.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";

const querySchema = z.object({
  windowDays: z.coerce.number().int().min(1).max(365).optional(),
});

export function createOutcomeReviewRouter(
  authService: AuthService,
  workspaceService: WorkspaceService,
  outcomeReviewService: OutcomeReviewService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");

  router.get("/", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      const parsed = querySchema.safeParse(request.query);
      if (!parsed.success) {
        throw toValidationError();
      }
      response.status(200).json(
        await outcomeReviewService.getReview(
          request.workspace,
          parsed.data.windowDays === undefined ? {} : { windowDays: parsed.data.windowDays },
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
