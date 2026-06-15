# Workspace Policies API

Phase 40 adds a small, allowlisted workspace governance contract. It is not a
general rules engine. All routes require authentication and active membership
in the selected `X-Workspace-Id`.

## `GET /workspace-policies`

Returns the selected workspace's three policy switches. Owners, admins, and
members may read policy state. A workspace with no saved policy receives all
rules disabled, preserving existing behavior.

## `PUT /workspace-policies`

Replaces the complete fixed rule set. Only owners and admins may update it:

```json
{
  "rules": {
    "requireAssignmentBeforeComparisonHandoff": true,
    "requireChecklistBeforeComparisonHandoff": true,
    "requireApprovalForComparisonPortfolio": true
  }
}
```

Partial or unknown rules are rejected rather than silently interpreted.

## Enforcement

Assignment and checklist rules apply to comparison-to-watchlist and
comparison-to-portfolio handoff. They are also checked before creating and
resolving a comparison-to-portfolio approval request. The approval rule blocks
direct portfolio handoff; the existing approval path satisfies that rule.

Blocked actions return `409 workspace_policy_blocked`. The error includes a
human-readable message and structured `details` containing the action,
`allowed: false`, and every unmet requirement with a code, message, and
resolution.

Approval resolution rechecks assignment and checklist readiness. Clearing an
assignment or reopening a required checklist item after request creation can
therefore block execution until the workspace policy is satisfied again.
