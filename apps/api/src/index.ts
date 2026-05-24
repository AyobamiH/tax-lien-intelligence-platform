import { connectMongo } from "@tax-lien/db";
import { createApp } from "./app.js";
import { apiConfig } from "./config/env.js";

async function main(): Promise<void> {
  await connectMongo({
    uri: apiConfig.mongoUri,
    dbName: apiConfig.mongoDbName,
  });

  const app = createApp();
  app.listen(apiConfig.port, () => {
    console.log(`Tax Lien API listening on port ${apiConfig.port}`);
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown startup error";
  console.error(`API failed to start: ${message}`);
  process.exit(1);
});
