import { Router, type Request } from "express";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import type { WorkspacePolicyService } from "../workspace-policies/workspace-policy-service.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";

const policySchema = z.object({
  rules: z
    .object({
      requireAssignmentBeforeComparisonHandoff: z.boolean(),
      requireChecklistBeforeComparisonHandoff: z.boolean(),
      requireApprovalForComparisonPortfolio: z.boolean(),
    })
    .strict(),
}).strict();

export function createWorkspacePolicyRouter(
  authService: AuthService,
  workspaceService: WorkspaceService,
  policyService: WorkspacePolicyService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");
  const requireWorkspaceWrite = requireWorkspaceAccess(workspaceService, "write");

  router.get("/", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      response.status(200).json(await policyService.get(requireContext(request)));
    } catch (error) {
      next(error);
    }
  });

  router.put("/", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }
      const parsed = policySchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }
      response.status(200).json(
        await policyService.update(
          requireContext(request),
          request.auth.userId,
          parsed.data.rules,
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function requireContext(request: Request) {
  if (!request.workspace) {
    throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
  }
  return request.workspace;
}
