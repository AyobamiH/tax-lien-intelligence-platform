import { AlertService } from "./alert-service.js";
import { MongoAlertStore } from "./alert-store.js";
import { createNotificationDeliveryService } from "../notification-delivery/factory.js";
import type { NotificationDeliveryService } from "../notification-delivery/notification-delivery-service.js";
import { createNotificationPreferenceService } from "../notification-preferences/factory.js";
import type { NotificationPreferenceService } from "../notification-preferences/notification-preference-service.js";

export function createAlertService(
  notificationPreferenceService: NotificationPreferenceService = createNotificationPreferenceService(),
  notificationDeliveryService: NotificationDeliveryService = createNotificationDeliveryService(),
): AlertService {
  return new AlertService(new MongoAlertStore(), notificationPreferenceService, notificationDeliveryService);
}
