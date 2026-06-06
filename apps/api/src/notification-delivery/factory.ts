import { MongoUserStore } from "../auth/user-store.js";
import { apiConfig } from "../config/env.js";
import { createNotificationPreferenceService } from "../notification-preferences/factory.js";
import type { NotificationPreferenceService } from "../notification-preferences/notification-preference-service.js";
import { SmtpEmailTransport } from "./smtp-email-transport.js";
import { MongoNotificationDigestBatchStore } from "./notification-digest-batch-store.js";
import { NotificationDeliveryService } from "./notification-delivery-service.js";
import { MongoNotificationDeliveryStore } from "./notification-delivery-store.js";

export function createNotificationDeliveryService(
  notificationPreferenceService: NotificationPreferenceService = createNotificationPreferenceService(),
): NotificationDeliveryService {
  const userStore = new MongoUserStore();

  return new NotificationDeliveryService(
    new MongoNotificationDeliveryStore(),
    new SmtpEmailTransport(apiConfig.email.smtp),
    async (userId) => {
      const user = await userStore.findById(userId);
      return user?.email ?? null;
    },
    apiConfig.email,
    new MongoNotificationDigestBatchStore(),
    (userId, alertType) => notificationPreferenceService.isDigestDeliveryEnabled(userId, alertType),
  );
}
