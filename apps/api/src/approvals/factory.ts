import type { ComparisonService } from "../comparison/comparison-service.js";
import { ApprovalService } from "./approval-service.js";
import { MongoApprovalRequestStore } from "./approval-store.js";

export function createApprovalService(comparisonService: ComparisonService): ApprovalService {
  return new ApprovalService(new MongoApprovalRequestStore(), comparisonService);
}
