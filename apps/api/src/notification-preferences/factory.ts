import { NotificationPreferenceService } from "./notification-preference-service.js";
import { MongoNotificationPreferenceStore } from "./notification-preference-store.js";

export function createNotificationPreferenceService(): NotificationPreferenceService {
  return new NotificationPreferenceService(new MongoNotificationPreferenceStore());
}
