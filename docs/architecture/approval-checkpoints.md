# Approval Checkpoint Architecture

Phase 36 adds a narrow trust layer for sensitive shared decisions. It is not a
general workflow engine.

## Initial Checkpoint

The only approval-backed action is:

`comparison_handoff_to_portfolio`

Members and admins request approval from the comparison detail surface. A
different owner/admin reviews the request. Approval executes the existing
comparison-to-portfolio handoff with status `tracked`; rejection and
cancellation do not change the comparison or portfolio.

Owners retain the direct handoff endpoint as an explicit compatibility
override for solo workspaces. It is blocked while a request is pending for the
target, so an intentional checkpoint cannot be bypassed. Admins and members
cannot call that endpoint directly.

## Model

`ApprovalRequest` stores:

- workspace id;
- allowlisted target entity type/id;
- allowlisted requested action;
- requester id, verified email snapshot, and role;
- `pending`, `approved`, `rejected`, or `cancelled` status;
- bounded request context;
- optional reviewer id, verified email snapshot, role, and response note;
- optional portfolio outcome id and duplicate result;
- created, updated, and resolved timestamps.

A partial unique index permits only one pending request for a workspace,
target, and action. Resolved requests remain available as bounded decision
context.

## Authorization Boundary

Every operation resolves active selected-workspace membership before approval
lookup.

- Active members may create and read requests.
- Owners/admins may review another user's pending request.
- Self-review is rejected.
- The requester alone may cancel.
- Approval ids are looked up with workspace id to prevent cross-workspace
  disclosure.
- Creation and approval revalidate the comparison target through the existing
  workspace compatibility tenant key.

Review authority is derived server-side. The client cannot submit workspace,
requester, reviewer, role, status, outcome, or timestamps.

## Transition Integrity

Approval calls the existing `ComparisonService.handoffToPortfolio` path rather
than reimplementing portfolio creation. This preserves:

- target ownership validation;
- duplicate-safe portfolio creation/reuse;
- the existing comparison handoff history event;
- bounded destination metadata.

A stale/deleted target blocks approval with `approval_target_stale`. A
short-lived atomic review claim serializes approve/reject decisions before the
sensitive action runs. Stale claims can be reclaimed, and pending-state
resolution still verifies the matching claim token.

## Activity And Frontend

Meaningful lifecycle changes create bounded workspace activity:

- `approval_requested`;
- `approval_approved`;
- `approval_rejected`;
- `approval_cancelled`.

Activity contains identifiers, action/status, and verified actor email
snapshots. Request/reviewer notes are deliberately excluded.

The web app adds:

- approval status on comparison detail;
- request creation for non-owner handoffs;
- `#/approvals` with status filters;
- server-derived approve, reject, and cancel controls;
- resolved reviewer rationale and portfolio outcome visibility.

## Compatibility

Existing comparison, decision-history, and portfolio records are unchanged.
No data migration is required. The direct portfolio handoff becomes owner-only
when no request is pending; admin/member transitions use the checkpoint.

## Boundary

There are no approval templates, chains, quorums, delegations, SLAs,
escalations, custom policies, e-signatures, task approvals, compliance
workflows, auction execution, or ML/AI routing.
