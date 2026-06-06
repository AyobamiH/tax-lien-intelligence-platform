import type { ScheduledTask } from "../scheduler/internal-scheduler.js";
import type { NotificationDeliveryService } from "./notification-delivery-service.js";

export function createNotificationDigestTask(
  notificationDeliveryService: NotificationDeliveryService,
  processingIntervalMs: number,
): ScheduledTask {
  return {
    id: "notification-digest-processing",
    intervalMs: processingIntervalMs,
    runImmediately: false,
    run: async ({ now }) => {
      const result = await notificationDeliveryService.processDigestQueue(now);
      if (result.usersConsidered > 0) {
        console.log(
          `Digest processing considered ${result.usersConsidered} users and sent ${result.batchesSent} batches`,
        );
      }
    },
  };
}
