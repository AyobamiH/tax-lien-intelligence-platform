import { connectMongo, disconnectMongo } from "@tax-lien/db";
import { apiConfig } from "./config/env.js";
import { InternalScheduler } from "./scheduler/internal-scheduler.js";
import { createWorkerJobProcessor } from "./worker/factory.js";

async function main(): Promise<void> {
  await connectMongo({
    uri: apiConfig.mongoUri,
    dbName: apiConfig.mongoDbName,
  });

  const processor = createWorkerJobProcessor();
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
  scheduler.start(Math.min(apiConfig.schedulerTickIntervalMs, apiConfig.workerPollIntervalMs));

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
