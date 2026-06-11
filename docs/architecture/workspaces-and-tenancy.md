# Workspaces And Tenancy Architecture

Phase 29 adds the first workspace and team-access foundation. It evolves the
product from authenticated single-user ownership to explicit workspace
membership without rewriting every persisted product record in one release.

## Models

`Workspace` stores:

- workspace name;
- primary owner user id;
- created and updated timestamps.

`WorkspaceMembership` stores:

- workspace id;
- user id;
- role: `owner`, `admin`, or `member`;
- active status;
- default-workspace marker;
- adding user id;
- joined, created, and updated timestamps.

There is one owner membership per workspace and one membership per
user/workspace pair.

## Bootstrap And Compatibility

The first workspace-aware request for a user creates a personal workspace and
owner membership if none exists. Adding an existing registered user to another
workspace also bootstraps that user's personal workspace first.

Core records created before Phase 29 keep their existing `userId`. For shared
operating data, that value is now the workspace owner's compatibility tenant
key. Routes never accept that key from the client. They resolve it only after:

1. authenticating the user;
2. resolving the selected workspace;
3. verifying an active membership;
4. checking the required role;
5. deriving the workspace owner's tenant key.

This preserves every existing record and avoids an unsafe bulk ownership
migration. A later migration may add explicit `workspaceId` fields after the
workspace boundary has earned operational confidence.

## Workspace Selection

Clients may send `X-Workspace-Id` on authenticated requests. If omitted, the
user's default personal workspace is used. A supplied id must match an active
membership or the API returns `workspace_access_denied`.

## Role Rules

- `owner`: read/write shared data, add members/admins, and change non-owner roles;
- `admin`: read/write shared data and add members, but cannot add admins or
  change roles;
- `member`: read shared data only.

The role set is intentionally small. There is no custom permission matrix.

## Shared And Personal Scope

Workspace-shared in Phase 29:

- datasets and import profiles;
- scoring results and job visibility;
- watchlist;
- portfolio and summary;
- comparison, decision notes, history, and handoff.

Still personal:

- alerts;
- notification preferences;
- notification delivery and digest history;
- saved views.

Personal surfaces remain user-scoped because notification routing and saved
attention preferences are individual settings in this phase.

## Membership Bootstrap

Owners and admins can add an already registered user directly by email.
Owners may assign `admin` or `member`; admins may add only `member`. There is no
email invitation token or pending invitation lifecycle yet.

## Boundaries

Phase 29 does not add comments, chat, concurrent editing, task assignment,
approvals, custom roles, billing, shared notification policy, auction
execution, or ML/AI collaboration features.
