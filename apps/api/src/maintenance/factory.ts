import { MongoDatasetStore } from "../datasets/dataset-store.js";
import { apiConfig } from "../config/env.js";
import type { InternalJobService } from "../jobs/internal-job-service.js";
import { MongoScoredRecordStore } from "../scoring/scored-record-store.js";
import { createMaintenancePolicy } from "./maintenance-policy.js";
import { MaintenanceService } from "./maintenance-service.js";

export function createMaintenanceService(internalJobService: InternalJobService): MaintenanceService {
  return new MaintenanceService(
    new MongoDatasetStore(),
    new MongoScoredRecordStore(),
    internalJobService,
    createMaintenancePolicy(apiConfig.maintenance),
  );
}
