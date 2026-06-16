import type { ApprovalService } from "../approvals/approval-service.js";
import type { ComparisonService } from "../comparison/comparison-service.js";
import type { DatasetService } from "../datasets/dataset-service.js";
import type { ReviewChecklistService } from "../review-checklists/review-checklist-service.js";
import type { WorkspaceAssignmentService } from "../workspace-assignments/workspace-assignment-service.js";
import type { WorkspaceCommentService } from "../workspace-comments/workspace-comment-service.js";
import type { WorkspacePolicyService } from "../workspace-policies/workspace-policy-service.js";
import { DecisionBriefService } from "./decision-brief-service.js";

export function createDecisionBriefService(
  comparisonService: ComparisonService,
  datasetService: DatasetService,
  assignmentService: WorkspaceAssignmentService,
  checklistService: ReviewChecklistService,
  approvalService: ApprovalService,
  commentService: WorkspaceCommentService,
  policyService: WorkspacePolicyService,
): DecisionBriefService {
  return new DecisionBriefService(
    comparisonService,
    datasetService,
    assignmentService,
    checklistService,
    approvalService,
    commentService,
    policyService,
  );
}
