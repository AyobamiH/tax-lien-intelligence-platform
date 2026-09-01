import { connectMongo, disconnectMongo } from "@tax-lien/db";
import { createApp } from "./app.js";
import { apiConfig } from "./config/env.js";

async function main(): Promise<void> {
  await connectMongo({
    uri: apiConfig.mongoUri,
    dbName: apiConfig.mongoDbName,
  });

  const app = createApp();
  const server = app.listen(apiConfig.port, () => {
    console.log(`Tax Lien API listening on port ${apiConfig.port}`);
  });

  let shutdownStarted = false;
  const shutdown = async (signal: "SIGINT" | "SIGTERM"): Promise<void> => {
    if (shutdownStarted) return;
    shutdownStarted = true;
    console.log(JSON.stringify({ event: "api_shutdown_started", signal }));

    server.close(async (error) => {
      try {
        await disconnectMongo();
      } finally {
        if (error) {
          console.error(JSON.stringify({ event: "api_shutdown_failed", errorClass: "http_server_close" }));
          process.exitCode = 1;
        }
      }
    });
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  void error;
  console.error(JSON.stringify({ event: "api_start_failed", errorClass: "startup_dependency" }));
  process.exit(1);
});
