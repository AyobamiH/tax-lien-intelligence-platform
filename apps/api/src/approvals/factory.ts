import type { ComparisonService } from "../comparison/comparison-service.js";
import type { WorkspacePolicyService } from "../workspace-policies/workspace-policy-service.js";
import { ApprovalService } from "./approval-service.js";
import { MongoApprovalRequestStore } from "./approval-store.js";

export function createApprovalService(
  comparisonService: ComparisonService,
  policyService: WorkspacePolicyService,
): ApprovalService {
  return new ApprovalService(
    new MongoApprovalRequestStore(),
    comparisonService,
    policyService,
  );
}
