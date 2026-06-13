import mongoose from "mongoose";
import type {
  SaveWorkspaceAssignmentInput,
  StoredWorkspaceAssignment,
  WorkspaceAssignmentStore,
  WorkspaceAssignmentTarget,
} from "../../apps/api/src/workspace-assignments/workspace-assignment-store.js";

export class InMemoryWorkspaceAssignmentStore implements WorkspaceAssignmentStore {
  private readonly assignments = new Map<string, StoredWorkspaceAssignment>();

  public async findForTarget(
    target: WorkspaceAssignmentTarget,
  ): Promise<StoredWorkspaceAssignment | null> {
    return this.assignments.get(this.key(target)) ?? null;
  }

  public async saveAssignment(
    input: SaveWorkspaceAssignmentInput,
  ): Promise<StoredWorkspaceAssignment> {
    const key = this.key(input);
    const existing = this.assignments.get(key);
    const now = new Date();
    const assignment: StoredWorkspaceAssignment = {
      id: existing?.id ?? new mongoose.Types.ObjectId().toString(),
      ...input,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.assignments.set(key, assignment);
    return assignment;
  }

  public async clearAssignment(
    target: WorkspaceAssignmentTarget,
  ): Promise<StoredWorkspaceAssignment | null> {
    const key = this.key(target);
    const assignment = this.assignments.get(key) ?? null;
    if (assignment) {
      this.assignments.delete(key);
    }
    return assignment;
  }

  public async listForAssignee(
    workspaceId: string,
    assigneeUserId: string,
  ): Promise<StoredWorkspaceAssignment[]> {
    return [...this.assignments.values()]
      .filter(
        (assignment) =>
          assignment.workspaceId === workspaceId &&
          assignment.assigneeUserId === assigneeUserId,
      )
      .sort(
        (left, right) =>
          right.updatedAt.getTime() - left.updatedAt.getTime() ||
          right.id.localeCompare(left.id),
      );
  }

  private key(target: WorkspaceAssignmentTarget): string {
    return `${target.workspaceId}:${target.relatedEntityType}:${target.relatedEntityId}`;
  }
}
