# Decision Outcome Architecture

Phase 42 adds a small final-resolution layer for comparison items. The system
now distinguishes active review from resolved decision work without turning
the product into case management.

## Model

`DecisionOutcome` is workspace-scoped and has one current record per
`workspaceId + targetEntityType + targetEntityId`.

The stored fields include:

- target entity type/id;
- final status: `approved`, `declined`, `deferred`, or `archived`;
- resolver user id, email, and workspace role;
- required resolution note;
- resolved timestamp;
- created/updated timestamps.

Updating the final status replaces the current outcome record instead of
creating conflicting final decisions. Repeating the same status and note is
treated as unchanged so retries do not create duplicate activity.

## Authorization

All outcome reads require authenticated selected-workspace membership and
target access. Outcome writes require owner/admin shared-data authority through
the existing workspace `write` permission.

Comparison item access is checked before reading or writing outcome state. A
member of another workspace receives the same target-not-found behavior used by
the comparison boundary.

## Governance Integration

Most final statuses can close the internal review regardless of unresolved
handoff prerequisites. `approved` is stricter:

- assignment/checklist policy evidence is checked through the existing
  workspace policy evaluator for the comparison approval-request action;
- pending approvals must be resolved or cancelled before an approved final
  outcome is recorded.

This keeps final approval coherent with the existing approval/checklist/policy
truth without building a new dependency engine.

## Activity

Meaningful outcome creation or changes create a single
`decision_outcome_resolved` workspace activity event. The event includes target
metadata and final status but does not copy the resolution rationale. The
authoritative note remains on the outcome record.

## Boundaries

Phase 42 does not include:

- reopen workflows;
- legal/compliance record systems;
- signatures or contracts;
- settlement tracking;
- due dates or reminder engines;
- external stakeholder portals;
- auction execution;
- AI outcome recommendations.
