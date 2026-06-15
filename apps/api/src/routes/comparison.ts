import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import { comparisonDecisions, type ComparisonService } from "../comparison/comparison-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import { portfolioStatuses } from "../portfolio/portfolio-service.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";
import {
  recordWorkspaceActivitySafely,
  type WorkspaceActivityService,
} from "../workspace-activity/workspace-activity-service.js";
import type { ApprovalService } from "../approvals/approval-service.js";
import type { WorkspacePolicyService } from "../workspace-policies/workspace-policy-service.js";

const comparisonDecisionSchema = z.enum(comparisonDecisions);
const portfolioStatusSchema = z.enum(portfolioStatuses);

const addComparisonItemSchema = z.object({
  scoredRecordId: z.string().min(1).max(128).optional(),
  watchlistItemId: z.string().min(1).max(128).optional(),
  portfolioItemId: z.string().min(1).max(128).optional(),
});

const updateComparisonItemSchema = z
  .object({
    decision: comparisonDecisionSchema.optional(),
    note: z.string().max(500).nullable().optional(),
  })
  .refine((value) => value.decision !== undefined || Object.prototype.hasOwnProperty.call(value, "note"));

const handoffToPortfolioSchema = z.object({
  status: portfolioStatusSchema.optional(),
});

export function createComparisonRouter(
  authService: AuthService,
  comparisonService: ComparisonService,
  workspaceService: WorkspaceService,
  activityService: WorkspaceActivityService,
  approvalService: ApprovalService,
  policyService: WorkspacePolicyService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");
  const requireWorkspaceWrite = requireWorkspaceAccess(workspaceService, "write");
  const requireSensitiveAction = requireWorkspaceAccess(workspaceService, "execute_sensitive_actions");

  router.post("/", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const parsed = addComparisonItemSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }

      const result = await comparisonService.addItem(request.workspace.tenantUserId, {
        ...(parsed.data.scoredRecordId ? { scoredRecordId: parsed.data.scoredRecordId } : {}),
        ...(parsed.data.watchlistItemId ? { watchlistItemId: parsed.data.watchlistItemId } : {}),
        ...(parsed.data.portfolioItemId ? { portfolioItemId: parsed.data.portfolioItemId } : {}),
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

      response.status(200).json(await comparisonService.listItems(request.workspace.tenantUserId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:comparisonItemId/history", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const comparisonItemId = request.params.comparisonItemId;
      if (typeof comparisonItemId !== "string") {
        throw new ApiError(400, "comparison_invalid_item_id", "Comparison item id is invalid.");
      }

      response.status(200).json(await comparisonService.listHistory(request.workspace.tenantUserId, comparisonItemId));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:comparisonItemId/handoff/watchlist", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const comparisonItemId = request.params.comparisonItemId;
      if (typeof comparisonItemId !== "string") {
        throw new ApiError(400, "comparison_invalid_item_id", "Comparison item id is invalid.");
      }

      await policyService.enforceComparisonAction(
        request.workspace,
        "comparison_handoff_to_watchlist",
        comparisonItemId,
      );
      const result = await comparisonService.handoffToWatchlist(request.workspace.tenantUserId, comparisonItemId);
      if (!result.alreadyExists) {
        await recordWorkspaceActivitySafely(activityService, {
          workspaceId: request.workspace.workspaceId,
          actorUserId: request.auth.userId,
          eventType: "comparison_handoff_to_watchlist",
          relatedEntityType: "comparison_item",
          relatedEntityId: comparisonItemId,
          metadata: {
            datasetId: result.item.datasetId,
            targetEntityType: "watchlist_item",
            targetEntityId: result.item.id,
          },
        });
      }
      response.status(result.alreadyExists ? 200 : 201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:comparisonItemId/handoff/portfolio", requireAuthenticatedUser, requireSensitiveAction, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const comparisonItemId = request.params.comparisonItemId;
      if (typeof comparisonItemId !== "string") {
        throw new ApiError(400, "comparison_invalid_item_id", "Comparison item id is invalid.");
      }

      const parsed = handoffToPortfolioSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        throw toValidationError();
      }

      await approvalService.assertNoPendingForTarget(request.workspace, comparisonItemId);
      await policyService.enforceComparisonAction(
        request.workspace,
        "comparison_handoff_to_portfolio",
        comparisonItemId,
      );
      const result = await comparisonService.handoffToPortfolio(request.workspace.tenantUserId, comparisonItemId, {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
      });
      if (!result.alreadyExists) {
        await recordWorkspaceActivitySafely(activityService, {
          workspaceId: request.workspace.workspaceId,
          actorUserId: request.auth.userId,
          eventType: "comparison_handoff_to_portfolio",
          relatedEntityType: "comparison_item",
          relatedEntityId: comparisonItemId,
          metadata: {
            datasetId: result.item.datasetId,
            targetEntityType: "portfolio_item",
            targetEntityId: result.item.id,
          },
        });
      }
      response.status(result.alreadyExists ? 200 : 201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:comparisonItemId", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const comparisonItemId = request.params.comparisonItemId;
      if (typeof comparisonItemId !== "string") {
        throw new ApiError(400, "comparison_invalid_item_id", "Comparison item id is invalid.");
      }

      const parsed = updateComparisonItemSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }

      const update: { decision?: (typeof comparisonDecisions)[number]; note?: string | null } = {};
      if (parsed.data.decision) {
        update.decision = parsed.data.decision;
      }
      if (Object.prototype.hasOwnProperty.call(parsed.data, "note")) {
        update.note = parsed.data.note ?? null;
      }

      const previous = (await comparisonService.listItems(request.workspace.tenantUserId)).items.find(
        (item) => item.id === comparisonItemId,
      );
      const result = await comparisonService.updateItem(
        request.workspace.tenantUserId,
        comparisonItemId,
        update,
      );
      if (previous && previous.decision !== result.item.decision) {
        await recordWorkspaceActivitySafely(activityService, {
          workspaceId: request.workspace.workspaceId,
          actorUserId: request.auth.userId,
          eventType: "comparison_decision_changed",
          relatedEntityType: "comparison_item",
          relatedEntityId: result.item.id,
          metadata: {
            datasetId: result.item.datasetId,
            previousDecision: previous.decision,
            newDecision: result.item.decision,
          },
        });
      }
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:comparisonItemId", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const comparisonItemId = request.params.comparisonItemId;
      if (typeof comparisonItemId !== "string") {
        throw new ApiError(400, "comparison_invalid_item_id", "Comparison item id is invalid.");
      }

      response.status(200).json(await comparisonService.deleteItem(request.workspace.tenantUserId, comparisonItemId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
