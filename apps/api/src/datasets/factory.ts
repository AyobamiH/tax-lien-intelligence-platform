import { DatasetService } from "./dataset-service.js";
import { MongoDatasetStore } from "./dataset-store.js";
import { MongoImportProfileStore } from "./import-profile-store.js";

export function createDatasetService(): DatasetService {
  return new DatasetService(new MongoDatasetStore(), new MongoImportProfileStore());
}
