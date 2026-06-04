import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import { requireAuth } from "../middleware/auth.js";
import type { SavedViewService } from "../saved-views/saved-view-service.js";
import type { CreateSavedViewRequest, UpdateSavedViewRequest } from "@tax-lien/types";

const savedViewFiltersSchema = z.record(z.string(), z.unknown());

const savedViewSortSchema = z.object({
  key: z.string().min(1).max(80),
  direction: z.string().min(1).max(12),
});

const createSavedViewSchema = z.object({
  surface: z.string().min(1).max(40),
  name: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  filters: savedViewFiltersSchema,
  sort: savedViewSortSchema.optional(),
});

const updateSavedViewSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(240).nullable().optional(),
    filters: savedViewFiltersSchema.optional(),
    sort: savedViewSortSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

export function createSavedViewRouter(authService: AuthService, savedViewService: SavedViewService): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);

  router.post("/", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const parsed = createSavedViewSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }

      const input: CreateSavedViewRequest = {
        surface: parsed.data.surface as CreateSavedViewRequest["surface"],
        name: parsed.data.name,
        filters: parsed.data.filters,
      };
      if (parsed.data.description !== undefined) {
        input.description = parsed.data.description;
      }
      if (parsed.data.sort) {
        input.sort = parsed.data.sort as NonNullable<CreateSavedViewRequest["sort"]>;
      }

      response.status(201).json(await savedViewService.createView(request.auth.userId, input));
    } catch (error) {
      next(error);
    }
  });

  router.get("/", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      response.status(200).json(await savedViewService.listViews(request.auth.userId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:savedViewId/apply", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const savedViewId = request.params.savedViewId;
      if (typeof savedViewId !== "string") {
        throw new ApiError(400, "saved_view_invalid_id", "Saved view id is invalid.");
      }

      response.status(200).json(await savedViewService.applyView(request.auth.userId, savedViewId));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:savedViewId", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const savedViewId = request.params.savedViewId;
      if (typeof savedViewId !== "string") {
        throw new ApiError(400, "saved_view_invalid_id", "Saved view id is invalid.");
      }

      const parsed = updateSavedViewSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }

      const input: UpdateSavedViewRequest = {};
      if (parsed.data.name !== undefined) {
        input.name = parsed.data.name;
      }
      if (parsed.data.description !== undefined) {
        input.description = parsed.data.description;
      }
      if (parsed.data.filters !== undefined) {
        input.filters = parsed.data.filters;
      }
      if (parsed.data.sort !== undefined) {
        input.sort = parsed.data.sort as NonNullable<UpdateSavedViewRequest["sort"]> | null;
      }

      response.status(200).json(await savedViewService.updateView(request.auth.userId, savedViewId, input));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:savedViewId", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const savedViewId = request.params.savedViewId;
      if (typeof savedViewId !== "string") {
        throw new ApiError(400, "saved_view_invalid_id", "Saved view id is invalid.");
      }

      response.status(200).json(await savedViewService.deleteView(request.auth.userId, savedViewId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
