import { Router } from "express";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import type { AlertService } from "../alerts/alert-service.js";
import { requireAuth } from "../middleware/auth.js";

export function createAlertRouter(authService: AuthService, alertService: AlertService): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);

  router.get("/", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      response.status(200).json(await alertService.listAlerts(request.auth.userId));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/read-all", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      response.status(200).json(await alertService.markAllAlertsRead(request.auth.userId));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:alertId/read", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const alertId = request.params.alertId;
      if (typeof alertId !== "string") {
        throw new ApiError(400, "alert_invalid_id", "Alert id is invalid.");
      }

      response.status(200).json(await alertService.markAlertRead(request.auth.userId, alertId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
