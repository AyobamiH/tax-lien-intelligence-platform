import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import { requireAuth } from "../middleware/auth.js";
import type { WatchlistService } from "../watchlist/watchlist-service.js";

const addWatchlistItemSchema = z.object({
  scoredRecordId: z.string().min(1).max(128),
});

export function createWatchlistRouter(authService: AuthService, watchlistService: WatchlistService): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);

  router.post("/", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const parsed = addWatchlistItemSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }

      const result = await watchlistService.addItem(request.auth.userId, parsed.data.scoredRecordId);
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

      response.status(200).json(await watchlistService.listItems(request.auth.userId));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:watchlistItemId", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const watchlistItemId = request.params.watchlistItemId;
      if (typeof watchlistItemId !== "string") {
        throw new ApiError(400, "watchlist_invalid_item_id", "Watchlist item id is invalid.");
      }

      response.status(200).json(await watchlistService.deleteItem(request.auth.userId, watchlistItemId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
