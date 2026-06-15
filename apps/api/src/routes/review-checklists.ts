import { Router, type Request } from "express";
import { z } from "zod";
import type { ReviewChecklistTargetEntityType } from "@tax-lien/types";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import type { ReviewChecklistService } from "../review-checklists/review-checklist-service.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";

const targetEntityTypeSchema = z.enum([
  "comparison_item",
  "watchlist_item",
  "portfolio_item",
]);
const targetSchema = z.object({
  entityType: targetEntityTypeSchema,
  entityId: z.string().min(1).max(128),
});
const templateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  active: z.boolean().optional(),
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(128).optional(),
        label: z.string().trim().min(1).max(120),
        required: z.boolean(),
      }),
    )
    .min(1)
    .max(20),
});
const completionSchema = z.object({ completed: z.boolean() });

export function createReviewChecklistRouter(
  authService: AuthService,
  workspaceService: WorkspaceService,
  reviewChecklistService: ReviewChecklistService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");
  const requireWorkspaceWrite = requireWorkspaceAccess(workspaceService, "write");

  router.get(
    "/templates",
    requireAuthenticatedUser,
    requireWorkspaceRead,
    async (request, response, next) => {
      try {
        response
          .status(200)
          .json(await reviewChecklistService.listTemplates(requireContext(request)));
      } catch (error) {
        next(error);
      }
    },
  );

  router.put(
    "/templates/:entityType",
    requireAuthenticatedUser,
    requireWorkspaceWrite,
    async (request, response, next) => {
      try {
        if (!request.auth) {
          throw new ApiError(
            401,
            "auth_missing_token",
            "Authentication token is required.",
          );
        }
        const entityType = parseEntityType(request.params.entityType);
        const parsed = templateSchema.safeParse(request.body);
        if (!parsed.success) {
          throw toValidationError();
        }
        response.status(200).json(
          await reviewChecklistService.upsertTemplate(
            requireContext(request),
            request.auth.userId,
            entityType,
            {
              name: parsed.data.name,
              ...(parsed.data.active === undefined
                ? {}
                : { active: parsed.data.active }),
              items: parsed.data.items.map((item) => ({
                ...(item.id ? { id: item.id } : {}),
                label: item.label,
                required: item.required,
              })),
            },
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:entityType/:entityId",
    requireAuthenticatedUser,
    requireWorkspaceRead,
    async (request, response, next) => {
      try {
        const target = parseTarget(request.params);
        response.status(200).json(
          await reviewChecklistService.getState(
            requireContext(request),
            target.entityType,
            target.entityId,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:entityType/:entityId/items/:itemId",
    requireAuthenticatedUser,
    requireWorkspaceRead,
    async (request, response, next) => {
      try {
        if (!request.auth) {
          throw new ApiError(
            401,
            "auth_missing_token",
            "Authentication token is required.",
          );
        }
        const target = parseTarget(request.params);
        const completion = completionSchema.safeParse(request.body);
        if (
          !completion.success ||
          typeof request.params.itemId !== "string"
        ) {
          throw toValidationError();
        }
        response.status(200).json(
          await reviewChecklistService.updateItem(
            requireContext(request),
            request.auth,
            target.entityType,
            target.entityId,
            request.params.itemId,
            completion.data.completed,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

function requireContext(request: Request) {
  if (!request.workspace) {
    throw new ApiError(
      403,
      "workspace_access_denied",
      "Workspace access is required.",
    );
  }
  return request.workspace;
}

function parseEntityType(value: unknown): ReviewChecklistTargetEntityType {
  const parsed = targetEntityTypeSchema.safeParse(value);
  if (!parsed.success) {
    throw toValidationError();
  }
  return parsed.data;
}

function parseTarget(value: unknown): {
  entityType: ReviewChecklistTargetEntityType;
  entityId: string;
} {
  const parsed = targetSchema.safeParse(value);
  if (!parsed.success) {
    throw toValidationError();
  }
  return {
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
  };
}
