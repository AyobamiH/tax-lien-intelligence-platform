import { AlertService } from "./alert-service.js";
import { MongoAlertStore } from "./alert-store.js";
import type { NotificationPreferenceService } from "../notification-preferences/notification-preference-service.js";

export function createAlertService(notificationPreferenceService?: NotificationPreferenceService): AlertService {
  return new AlertService(new MongoAlertStore(), notificationPreferenceService);
}
