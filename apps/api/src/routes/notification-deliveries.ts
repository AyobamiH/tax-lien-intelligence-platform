import { Router } from "express";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { requireAuth } from "../middleware/auth.js";
import type { NotificationDeliveryService } from "../notification-delivery/notification-delivery-service.js";

export function createNotificationDeliveryRouter(
  authService: AuthService,
  notificationDeliveryService: NotificationDeliveryService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);

  router.get("/", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      response.status(200).json(await notificationDeliveryService.getDeliveryHistory(request.auth.userId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
