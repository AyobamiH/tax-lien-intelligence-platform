# My Work Architecture

Phase 37 adds a personal operational home over existing workflow data. It is an
aggregation layer, not a task-management domain.

## Sources

`MyWorkService` composes existing services:

- `WorkspaceAssignmentService.listMine`;
- `ApprovalService.list` filtered to pending requests the actor can review;
- `DiscussionAttentionService.listUnread`.
- `FollowService.listMine`.

No new persistence model is introduced. Assignment, approval, discussion
attention, follow subscriptions, membership, and target-access records remain
authoritative.

## Security Boundary

`GET /my-work` runs after authentication and selected-workspace read access.
The service uses the verified actor id and workspace access context; clients do
not submit a user id.

Assignments retain their existing stale-target filter. Approvals and discussion
attention are rechecked through the shared target-access adapter before they are
included. This prevents an aggregation response from revealing records that
were deleted, moved, or are no longer accessible.

Approval reviewer eligibility remains server-derived, including role and
self-review rules. Discussion rows contain only attention metadata, never
comment bodies.
Follow subscriptions are revalidated against current target access and remain
an informational signal rather than an inferred obligation.

## Response Shape

The response includes:

- grouped counts;
- a generated timestamp;
- compact assignment, approval, discussion, and followed-record previews;
- unread thread and unread message counts.

Each preview is capped at eight items. Existing source stores remain bounded at
100 records, so aggregation does not become an unbounded workspace scan.

## Frontend

`#/my-work` is the default signed-in and workspace-switch destination. It shows
compact counts and four line-item queues with navigation into the existing
dataset, comparison, watchlist, portfolio, and approval surfaces.
The Following queue is visually separate and does not contribute to the
actionable total.

Dedicated assignment and approval pages remain available for deeper work. The
home view does not duplicate review controls or mark discussions read merely
because they were summarized.

## Deliberate Exclusions

Recent workspace activity is not included in this phase because the existing
activity feed is workspace-wide and cannot reliably distinguish personal action
from ambient information.

There are no task objects, due dates, priorities, boards, SLA/escalation
engines, workload balancing, managerial analytics, or AI ranking.
