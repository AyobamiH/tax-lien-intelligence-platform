import type { ReviewChecklistService } from "../review-checklists/review-checklist-service.js";
import type { WorkspaceAssignmentService } from "../workspace-assignments/workspace-assignment-service.js";
import { WorkspacePolicyService } from "./workspace-policy-service.js";
import { MongoWorkspacePolicyStore } from "./workspace-policy-store.js";

export function createWorkspacePolicyService(
  assignmentService: WorkspaceAssignmentService,
  checklistService: ReviewChecklistService,
): WorkspacePolicyService {
  return new WorkspacePolicyService(
    new MongoWorkspacePolicyStore(),
    assignmentService,
    checklistService,
  );
}
