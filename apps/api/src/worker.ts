import { connectMongo, disconnectMongo } from "@tax-lien/db";
import { apiConfig } from "./config/env.js";
import { createMaintenanceService } from "./maintenance/factory.js";
import { createNotificationDigestTask } from "./notification-delivery/digest-scheduler.js";
import { createNotificationDeliveryService } from "./notification-delivery/factory.js";
import { createNotificationPreferenceService } from "./notification-preferences/factory.js";
import { InternalScheduler } from "./scheduler/internal-scheduler.js";
import { createAlertService } from "./alerts/factory.js";
import { createInternalJobService } from "./jobs/factory.js";
import { createScoringService } from "./scoring/factory.js";
import { WorkerJobProcessor } from "./worker/worker-job-processor.js";

async function main(): Promise<void> {
  await connectMongo({
    uri: apiConfig.mongoUri,
    dbName: apiConfig.mongoDbName,
  });

  const notificationPreferenceService = createNotificationPreferenceService();
  const notificationDeliveryService = createNotificationDeliveryService(notificationPreferenceService);
  const alertService = createAlertService(notificationPreferenceService, notificationDeliveryService);
  const internalJobService = createInternalJobService(alertService);
  const scoringService = createScoringService(internalJobService);
  const maintenanceService = createMaintenanceService(internalJobService);
  const processor = new WorkerJobProcessor(internalJobService, scoringService, maintenanceService);
  const scheduler = new InternalScheduler();
  const runOnce = process.argv.includes("--once");

  if (runOnce) {
    const result = await processor.processNextJob();
    console.log(`Worker run once finished with status: ${result.status}`);
    await disconnectMongo();
    return;
  }

  console.log(`Tax Lien worker polling every ${apiConfig.workerPollIntervalMs}ms`);
  scheduler.register({
    id: "internal-job-poll",
    intervalMs: apiConfig.workerPollIntervalMs,
    runImmediately: true,
    run: async () => {
      const result = await processor.processNextJob();
      if (result.status !== "idle") {
        console.log(`Worker processed job with status: ${result.status}`);
      }
    },
  });
  scheduler.register({
    id: "dataset-maintenance-scan",
    intervalMs: apiConfig.maintenance.scanIntervalMs,
    runImmediately: true,
    run: async ({ now }) => {
      const result = await maintenanceService.runScheduledMaintenance(now);
      if (result.staleDatasetCount > 0) {
        console.log(
          `Maintenance scan found ${result.staleDatasetCount} stale datasets and queued ${result.maintenanceJobsQueued} maintenance jobs`,
        );
      }
    },
  });
  scheduler.register(
    createNotificationDigestTask(notificationDeliveryService, apiConfig.email.digest.processingIntervalMs),
  );
  scheduler.start(
    Math.min(
      apiConfig.schedulerTickIntervalMs,
      apiConfig.workerPollIntervalMs,
      apiConfig.maintenance.scanIntervalMs,
      apiConfig.email.digest.processingIntervalMs,
    ),
  );

  const shutdown = async (): Promise<void> => {
    scheduler.stop();
    await disconnectMongo();
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void shutdown();
  });
  process.once("SIGTERM", () => {
    void shutdown();
  });

  await scheduler.runDueTasks();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown worker startup error";
  console.error(`Worker failed to start: ${message}`);
  process.exit(1);
});
