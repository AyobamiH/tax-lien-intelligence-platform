# Workspaces API

All workspace routes require bearer authentication.

## Workspace Header

Use `X-Workspace-Id` to select a workspace. If omitted, the user's default
personal workspace is used. A non-member receives:

```json
{
  "error": {
    "code": "workspace_access_denied",
    "message": "You do not have access to this workspace."
  }
}
```

## `GET /workspaces`

Returns active memberships and the current workspace id. The first call
bootstraps a personal owner workspace when needed.

## `GET /workspaces/current`

Returns the selected workspace, current role, member count, and explicit
permission booleans for shared-data mutation, member addition/removal, role
management, approval request/review, and direct sensitive-action execution.

## `GET /workspaces/current/members`

Returns active members with email, role, status, default marker, and timestamps.
Any active member may view the workspace member list.

## `POST /workspaces/current/members`

Adds an already registered user.

```json
{
  "email": "colleague@example.com",
  "role": "member"
}
```

Owners may add `admin` or `member`. Admins may add only `member`. Members cannot
add users. Unknown users receive `workspace_member_user_not_found`; duplicate
memberships receive `workspace_member_exists`.

## `PATCH /workspaces/current/members/:membershipId`

Owner-only role update for a non-owner membership.

```json
{
  "role": "admin"
}
```

The owner role cannot be assigned or changed through this route. Admins and
members receive `workspace_role_forbidden`, including attempts to change their
own role.

## `DELETE /workspaces/current/members/:membershipId`

Deactivates a non-owner membership and immediately removes that user's access
to the selected workspace. The membership record is retained as `inactive` and
can be safely reactivated by adding the registered user again.

- owners may remove admins or members;
- admins may remove regular members only;
- members cannot remove anyone;
- the owner cannot be removed because ownership transfer is not implemented.

Owner removal returns `workspace_owner_protected`. A membership id from another
workspace returns the same `workspace_member_not_found` response as an unknown
id, preventing cross-workspace disclosure.

## `GET /workspaces/current/activity`

Returns recent meaningful activity for the selected workspace. Any active
member may read the feed.

Optional query parameters:

- `category`: `data`, `decisions`, `portfolio`, `members`, `responsibility`, or
  `approvals`;
- `limit`: integer from 1 to 100; defaults to 30.

Example response:

```json
{
  "activities": [
    {
      "id": "activity-id",
      "workspaceId": "workspace-id",
      "actor": {
        "userId": "user-id",
        "email": "analyst@example.com"
      },
      "category": "data",
      "eventType": "dataset_uploaded",
      "relatedEntityType": "dataset",
      "relatedEntityId": "dataset-id",
      "summary": "Uploaded dataset June county sale.",
      "metadata": {
        "datasetId": "dataset-id",
        "datasetName": "June county sale"
      },
      "occurredAt": "2026-06-11T12:00:00.000Z"
    }
  ]
}
```

The API never accepts summary text from the client. Summaries are derived from
allowlisted event metadata. The feed does not expose notes, raw source rows,
stack traces, provider payloads, password/auth events, or another workspace's
activity.

## Workspace-Aware Product Routes

The selected workspace applies to dataset, scoring, job, watchlist, portfolio,
and comparison routes. `owner` and `admin` may mutate these resources;
`member` is read-only. Alerts, notification settings/history, and saved views
remain personal and ignore workspace ownership in Phase 29.

Workspace activity is shared operational context in Phase 30. It complements
comparison item history; it does not replace that item-level timeline and is
not a compliance-grade audit API.

Phase 42 final outcome changes can create `decision_outcome_resolved` activity
in the `decisions` category. The activity stores target/outcome metadata and
resolver identity, not the resolution rationale.

Workspace comments are shared contextual discussion in Phase 31 and use their
own `/comments` API. Active members may comment on accessible shared records;
comments are not emitted into workspace activity.

Phase 36 approval requests use the same selected-workspace membership boundary.
All active roles may request a supported checkpoint, owners/admins may review a
different member's request, and only owners may execute the direct
comparison-to-portfolio action.

Phase 35 adds role-aware administration, not enterprise IAM. Custom roles,
SSO/SAML, SCIM, arbitrary permission matrices, and ownership transfer remain
out of scope.
