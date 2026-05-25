import { AlertService } from "./alert-service.js";
import { MongoAlertStore } from "./alert-store.js";

export function createAlertService(): AlertService {
  return new AlertService(new MongoAlertStore());
}
