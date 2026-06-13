# Workspace Assignments Architecture

Phase 33 adds explicit responsibility to shared operating records without
turning the product into project management software.

## Model

`WorkspaceAssignment` stores:

- workspace id;
- allowlisted target entity type and id;
- current assignee user id;
- verified assigning actor user id;
- assigned timestamp;
- created and updated timestamps.

A unique workspace/type/id index enforces one current assignment per target.
An assignee index supports the bounded `Assigned to me` queue.

## Authorization

Every read or mutation first resolves selected-workspace membership and then
verifies the target through the existing dataset, comparison, watchlist, or
portfolio access adapter using the workspace compatibility tenant key.

The requested assignee must have an active membership in the same workspace.
The client cannot supply workspace ownership or actor identity. Missing,
deleted, and cross-workspace targets share a safe not-found response.

Phase 35 restricts assign, reassign, and clear operations to owners and admins.
Active members may still read current responsibility and use their personal
assigned-to-me queue. Owner/admin/member remains the complete role set; this
hardening does not introduce a permission matrix.

## Activity And Notifications

Meaningful changes create `responsibility` workspace activity:

- `entity_assigned`;
- `entity_reassigned`;
- `entity_assignment_cleared`.

Assigning the same member again is a no-op and emits neither activity nor an
alert. Assignment persistence is authoritative; activity and notification work
is best effort after persistence.

The new assignee receives `workspace_item_assigned` unless they are also the
actor. Reassignment notifies only the new assignee. Clearing does not notify.
Alerts use the existing personal preference, email outbox, and digest pipeline
and contain only workspace, assignment, actor, and target identifiers.

## Frontend

Each supported detail surface shows current responsibility and provides a
member selector with assign/reassign/clear controls for owners/admins and a
clear restricted state for members. Assignments to deactivated members remain
visible as historical markers until an owner/admin deliberately reassigns or
clears them. `#/assignments` lists the authenticated member's accessible
assignments and links back to the owning surface.

## Boundary

Assignments are current responsibility markers, not tasks. There are no due
dates, reminders, priorities, statuses, subtasks, boards, assignment approval
chains, automatic routing, or assignment-specific conversation threads. Phase
36 approval requests remain a separate comparison-to-portfolio checkpoint.
