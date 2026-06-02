import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import { comparisonDecisions, type ComparisonService } from "../comparison/comparison-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { portfolioStatuses } from "../portfolio/portfolio-service.js";

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

export function createComparisonRouter(authService: AuthService, comparisonService: ComparisonService): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);

  router.post("/", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const parsed = addComparisonItemSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }

      const result = await comparisonService.addItem(request.auth.userId, {
        ...(parsed.data.scoredRecordId ? { scoredRecordId: parsed.data.scoredRecordId } : {}),
        ...(parsed.data.watchlistItemId ? { watchlistItemId: parsed.data.watchlistItemId } : {}),
        ...(parsed.data.portfolioItemId ? { portfolioItemId: parsed.data.portfolioItemId } : {}),
      });
      response.status(result.alreadyExists ? 200 : 201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      response.status(200).json(await comparisonService.listItems(request.auth.userId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:comparisonItemId/history", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const comparisonItemId = request.params.comparisonItemId;
      if (typeof comparisonItemId !== "string") {
        throw new ApiError(400, "comparison_invalid_item_id", "Comparison item id is invalid.");
      }

      response.status(200).json(await comparisonService.listHistory(request.auth.userId, comparisonItemId));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:comparisonItemId/handoff/watchlist", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const comparisonItemId = request.params.comparisonItemId;
      if (typeof comparisonItemId !== "string") {
        throw new ApiError(400, "comparison_invalid_item_id", "Comparison item id is invalid.");
      }

      const result = await comparisonService.handoffToWatchlist(request.auth.userId, comparisonItemId);
      response.status(result.alreadyExists ? 200 : 201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:comparisonItemId/handoff/portfolio", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const comparisonItemId = request.params.comparisonItemId;
      if (typeof comparisonItemId !== "string") {
        throw new ApiError(400, "comparison_invalid_item_id", "Comparison item id is invalid.");
      }

      const parsed = handoffToPortfolioSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        throw toValidationError();
      }

      const result = await comparisonService.handoffToPortfolio(request.auth.userId, comparisonItemId, {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
      });
      response.status(result.alreadyExists ? 200 : 201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:comparisonItemId", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
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

      response.status(200).json(await comparisonService.updateItem(request.auth.userId, comparisonItemId, update));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:comparisonItemId", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const comparisonItemId = request.params.comparisonItemId;
      if (typeof comparisonItemId !== "string") {
        throw new ApiError(400, "comparison_invalid_item_id", "Comparison item id is invalid.");
      }

      response.status(200).json(await comparisonService.deleteItem(request.auth.userId, comparisonItemId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
