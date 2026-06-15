# Approval Requests API

Phase 36 adds a focused review checkpoint for one sensitive action:
moving a comparison item into portfolio tracking.

All routes require bearer authentication and active membership in the workspace
selected by `X-Workspace-Id`. Approval ids are always resolved inside that
workspace, so an id from another workspace returns `approval_not_found`.

## Roles And Rules

- Any active owner, admin, or member may create and read approval requests.
- Owners and admins may approve or reject requests created by another user.
- Requesters cannot approve or reject their own requests.
- Only the requester may cancel a pending request.
- Only owners may call the direct comparison portfolio handoff route, and only
  while no request is pending for that target.
- There may be only one pending request for the same workspace, target, and
  action. Repeating creation returns that request with `alreadyPending: true`.

This is an intentionally small role model, not a custom permission matrix.

## `POST /approvals`

Creates a comparison-to-portfolio approval request after verifying that the
comparison item is accessible through the selected workspace.

```json
{
  "targetEntityType": "comparison_item",
  "targetEntityId": "comparison-item-id",
  "requestedAction": "comparison_handoff_to_portfolio",
  "requestNote": "County source checks are complete and this is ready for tracked diligence."
}
```

The request note is required plain text, trimmed, capped at 500 characters, and
rejects unsupported control characters.

When enabled, workspace assignment and required-checklist policies are checked
before request creation. The approval-required policy does not block creation;
the request is the supported way to satisfy that rule.

Response:

```json
{
  "approval": {
    "id": "approval-request-id",
    "workspaceId": "workspace-id",
    "targetEntityType": "comparison_item",
    "targetEntityId": "comparison-item-id",
    "requestedAction": "comparison_handoff_to_portfolio",
    "status": "pending",
    "requester": {
      "userId": "member-user-id",
      "email": "member@example.com",
      "role": "member"
    },
    "requestNote": "County source checks are complete and this is ready for tracked diligence.",
    "canReview": false,
    "canCancel": true,
    "createdAt": "2026-06-13T12:00:00.000Z",
    "updatedAt": "2026-06-13T12:00:00.000Z"
  },
  "alreadyPending": false
}
```

## `GET /approvals`

Returns up to 100 newest-first requests in the selected workspace.

Optional query parameters:

- `status`: `pending`, `approved`, `rejected`, or `cancelled`;
- `targetEntityType`: currently only `comparison_item`;
- `targetEntityId`: one comparison item id.

The server derives `canReview` and `canCancel` for the authenticated actor.

## `GET /approvals/:approvalRequestId`

Returns one workspace-scoped approval request.

## `POST /approvals/:approvalRequestId/approve`

Owner/admin reviewer action. The reviewer must differ from the requester.

```json
{
  "responseNote": "Approved for tracked diligence only."
}
```

The response note is optional and uses the same 500-character plain-text
boundary. Approval revalidates the comparison target, executes the existing
duplicate-safe comparison-to-portfolio handoff with status `tracked`, and
records the resulting portfolio item in `outcome`.

The existing decision-history handoff event remains the record of the actual
portfolio transition.

Assignment and checklist policy evidence is rechecked before execution. If
readiness changed after request creation, approval returns
`workspace_policy_blocked`, releases its review claim, and remains pending.

## `POST /approvals/:approvalRequestId/reject`

Owner/admin reviewer action. A bounded response note is required.

```json
{
  "responseNote": "Verify the county source date before moving this forward."
}
```

Rejection records the review outcome and does not mutate portfolio data.

## `POST /approvals/:approvalRequestId/cancel`

Cancels a pending request. Only the original requester may cancel it. Cancellation
does not mutate portfolio data.

## Stale And Resolved Requests

- Creating or approving against a missing/deleted comparison item returns
  `approval_target_stale`.
- Approving, rejecting, or cancelling a request that is no longer pending
  returns `approval_already_resolved`.
- Concurrent reviewers are serialized by an internal short-lived claim; a
  competing decision returns `approval_review_in_progress`.
- Invalid ids are rejected before lookup.
- Cross-workspace approval detail is not disclosed.

## Activity And Notifications

Request, approval, rejection, and cancellation create bounded `approvals`
workspace activity. Request and reviewer notes are not copied into activity.

Phase 36 does not create alerts, emails, or digest entries. That choice avoids
new notification noise and preference behavior until a later explicit phase.

## Boundary

The API does not provide multi-step chains, arbitrary reviewer routing,
workflow definitions, SLAs, escalation, e-signatures, compliance policy, task
approvals, auction execution, or AI routing.
