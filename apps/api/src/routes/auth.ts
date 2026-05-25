import { Router } from "express";
import type { AuthMeResponse } from "@tax-lien/types";
import type { AuthService } from "../auth/auth-service.js";
import { loginSchema, parseRequestBody, registerSchema } from "../auth/validation.js";
import { ApiError } from "../errors/api-error.js";
import { requireAuth } from "../middleware/auth.js";

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);

  router.post("/register", async (request, response, next) => {
    try {
      const payload = parseRequestBody(registerSchema, request.body);
      const result = await authService.register(payload);
      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", async (request, response, next) => {
    try {
      const payload = parseRequestBody(loginSchema, request.body);
      const result = await authService.login(payload);
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/me", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const user = await authService.getCurrentUser(request.auth.userId);
      response.status(200).json({ user } satisfies AuthMeResponse);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
