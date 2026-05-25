import { MongoDatasetStore } from "../datasets/dataset-store.js";
import { createInternalJobService } from "../jobs/factory.js";
import type { InternalJobService } from "../jobs/internal-job-service.js";
import { MongoScoredRecordStore } from "./scored-record-store.js";
import { ScoringService } from "./scoring-service.js";

export function createScoringService(internalJobService: InternalJobService = createInternalJobService()): ScoringService {
  return new ScoringService(new MongoDatasetStore(), new MongoScoredRecordStore(), internalJobService);
}
