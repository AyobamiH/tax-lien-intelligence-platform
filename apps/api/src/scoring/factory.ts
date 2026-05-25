import { MongoDatasetStore } from "../datasets/dataset-store.js";
import { MongoScoredRecordStore } from "./scored-record-store.js";
import { ScoringService } from "./scoring-service.js";

export function createScoringService(): ScoringService {
  return new ScoringService(new MongoDatasetStore(), new MongoScoredRecordStore());
}
