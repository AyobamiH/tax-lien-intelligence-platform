import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import { requireAuth } from "../middleware/auth.js";
import type { PortfolioService } from "../portfolio/portfolio-service.js";
import { portfolioStatuses } from "../portfolio/portfolio-service.js";

const portfolioStatusSchema = z.enum(portfolioStatuses);

const addPortfolioItemSchema = z.object({
  scoredRecordId: z.string().min(1).max(128).optional(),
  watchlistItemId: z.string().min(1).max(128).optional(),
  status: portfolioStatusSchema.optional(),
});

const updatePortfolioItemSchema = z.object({
  status: portfolioStatusSchema,
});

export function createPortfolioRouter(authService: AuthService, portfolioService: PortfolioService): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);

  router.post("/", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const parsed = addPortfolioItemSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }

      const result = await portfolioService.addItem(request.auth.userId, {
        ...(parsed.data.scoredRecordId ? { scoredRecordId: parsed.data.scoredRecordId } : {}),
        ...(parsed.data.watchlistItemId ? { watchlistItemId: parsed.data.watchlistItemId } : {}),
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
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

      response.status(200).json(await portfolioService.listItems(request.auth.userId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:portfolioItemId", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const portfolioItemId = request.params.portfolioItemId;
      if (typeof portfolioItemId !== "string") {
        throw new ApiError(400, "portfolio_invalid_item_id", "Portfolio item id is invalid.");
      }

      response.status(200).json(await portfolioService.getItem(request.auth.userId, portfolioItemId));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:portfolioItemId", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const portfolioItemId = request.params.portfolioItemId;
      if (typeof portfolioItemId !== "string") {
        throw new ApiError(400, "portfolio_invalid_item_id", "Portfolio item id is invalid.");
      }

      const parsed = updatePortfolioItemSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }

      response.status(200).json(
        await portfolioService.updateStatus(request.auth.userId, portfolioItemId, parsed.data.status),
      );
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:portfolioItemId", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const portfolioItemId = request.params.portfolioItemId;
      if (typeof portfolioItemId !== "string") {
        throw new ApiError(400, "portfolio_invalid_item_id", "Portfolio item id is invalid.");
      }

      response.status(200).json(await portfolioService.deleteItem(request.auth.userId, portfolioItemId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
