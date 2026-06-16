import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import type { DecisionBriefService } from "../decision-briefs/decision-brief-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";

const briefTargetSchema = z.object({
  entityType: z.literal("comparison_item"),
  entityId: z.string().min(1).max(128),
});

export function createDecisionBriefRouter(
  authService: AuthService,
  workspaceService: WorkspaceService,
  decisionBriefService: DecisionBriefService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");

  router.get("/:entityType/:entityId", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      const parsed = briefTargetSchema.safeParse(request.params);
      if (!parsed.success) {
        throw toValidationError();
      }
      response.status(200).json(
        await decisionBriefService.getBrief(
          request.workspace,
          request.auth,
          parsed.data.entityType,
          parsed.data.entityId,
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
