import { Router, type Request } from "express";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import {
  decisionOutcomeStatuses,
  type DecisionOutcomeService,
} from "../decision-outcomes/decision-outcome-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import {
  recordWorkspaceActivitySafely,
  type WorkspaceActivityService,
} from "../workspace-activity/workspace-activity-service.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";

const targetSchema = z.object({
  entityType: z.literal("comparison_item"),
  entityId: z.string().min(1).max(128),
});

const resolveSchema = z.object({
  status: z.enum(decisionOutcomeStatuses),
  note: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value)),
});

export function createDecisionOutcomeRouter(
  authService: AuthService,
  workspaceService: WorkspaceService,
  decisionOutcomeService: DecisionOutcomeService,
  activityService: WorkspaceActivityService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");
  const requireWorkspaceWrite = requireWorkspaceAccess(workspaceService, "write");

  router.get("/:entityType/:entityId", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      const parsed = targetSchema.safeParse(request.params);
      if (!parsed.success) {
        throw toValidationError();
      }
      response.status(200).json(
        await decisionOutcomeService.getState(
          request.workspace,
          parsed.data.entityType,
          parsed.data.entityId,
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  router.put("/:entityType/:entityId", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      const target = targetSchema.safeParse(request.params);
      const body = resolveSchema.safeParse(request.body);
      if (!target.success || !body.success) {
        throw toValidationError();
      }
      const result = await decisionOutcomeService.resolve(
        request.workspace,
        request.auth,
        target.data.entityType,
        target.data.entityId,
        body.data.status,
        body.data.note,
      );
      if (result.changed) {
        await recordResolutionActivity(activityService, request, result.state.outcome?.id, body.data.status);
      }
      response.status(result.changed ? 201 : 200).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

async function recordResolutionActivity(
  activityService: WorkspaceActivityService,
  request: Request,
  decisionOutcomeId: string | undefined,
  status: (typeof decisionOutcomeStatuses)[number],
): Promise<void> {
  if (!request.auth || !request.workspace || typeof request.params.entityId !== "string") {
    return;
  }
  await recordWorkspaceActivitySafely(activityService, {
    workspaceId: request.workspace.workspaceId,
    actorUserId: request.auth.userId,
    eventType: "decision_outcome_resolved",
    relatedEntityType: "comparison_item",
    relatedEntityId: request.params.entityId,
    metadata: {
      targetEntityType: "comparison_item",
      targetEntityId: request.params.entityId,
      ...(decisionOutcomeId ? { decisionOutcomeId } : {}),
      decisionOutcomeStatus: status,
      decisionOutcomeResolverEmail: request.auth.email,
    },
  });
}
