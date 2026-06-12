import { Router } from "express";
import { z } from "zod";
import type {
  NotificationPreferenceRule,
  UpdateNotificationPreferencesRequest,
} from "@tax-lien/types";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import { requireAuth } from "../middleware/auth.js";
import type { NotificationPreferenceService } from "../notification-preferences/notification-preference-service.js";
import { notificationAlertTypes } from "../notification-preferences/notification-preference-service.js";

const notificationPreferenceRuleSchema = z.object({
  alertType: z.string().min(1).max(80),
  enabled: z.boolean(),
  deliveryMode: z.string().min(1).max(40),
  cadence: z.string().min(1).max(40),
});

const updateNotificationPreferencesSchema = z.object({
  rules: z.array(notificationPreferenceRuleSchema).min(1).max(notificationAlertTypes.length),
});

export function createNotificationPreferenceRouter(
  authService: AuthService,
  notificationPreferenceService: NotificationPreferenceService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);

  router.get("/", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      response.status(200).json(await notificationPreferenceService.getPreferences(request.auth.userId));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const parsed = updateNotificationPreferencesSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }

      const input: UpdateNotificationPreferencesRequest = {
        rules: parsed.data.rules as NotificationPreferenceRule[],
      };
      response.status(200).json(await notificationPreferenceService.updatePreferences(request.auth.userId, input));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
