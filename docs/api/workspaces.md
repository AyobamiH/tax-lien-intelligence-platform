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
permission booleans.

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

The owner role cannot be assigned or changed through this route.

## Workspace-Aware Product Routes

The selected workspace applies to dataset, scoring, job, watchlist, portfolio,
and comparison routes. `owner` and `admin` may mutate these resources;
`member` is read-only. Alerts, notification settings/history, and saved views
remain personal and ignore workspace ownership in Phase 29.
