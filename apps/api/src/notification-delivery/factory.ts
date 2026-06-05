import { MongoUserStore } from "../auth/user-store.js";
import { apiConfig } from "../config/env.js";
import { SmtpEmailTransport } from "./smtp-email-transport.js";
import { NotificationDeliveryService } from "./notification-delivery-service.js";
import { MongoNotificationDeliveryStore } from "./notification-delivery-store.js";

export function createNotificationDeliveryService(): NotificationDeliveryService {
  const userStore = new MongoUserStore();

  return new NotificationDeliveryService(
    new MongoNotificationDeliveryStore(),
    new SmtpEmailTransport(apiConfig.email.smtp),
    async (userId) => {
      const user = await userStore.findById(userId);
      return user?.email ?? null;
    },
    apiConfig.email,
  );
}
