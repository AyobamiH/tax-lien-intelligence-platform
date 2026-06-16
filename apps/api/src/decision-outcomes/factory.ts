import type { ApprovalService } from "../approvals/approval-service.js";
import type { ComparisonService } from "../comparison/comparison-service.js";
import type { WorkspacePolicyService } from "../workspace-policies/workspace-policy-service.js";
import { DecisionOutcomeService } from "./decision-outcome-service.js";
import { MongoDecisionOutcomeStore } from "./decision-outcome-store.js";

export function createDecisionOutcomeService(
  comparisonService: ComparisonService,
  approvalService: ApprovalService,
  policyService: WorkspacePolicyService,
): DecisionOutcomeService {
  return new DecisionOutcomeService(
    new MongoDecisionOutcomeStore(),
    comparisonService,
    approvalService,
    policyService,
  );
}
