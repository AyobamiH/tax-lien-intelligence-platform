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

Phase 30 activity records are explicitly workspace-owned from creation and do
not use the legacy owner `userId` compatibility key. This gives the shared
awareness layer a direct tenant boundary while core pre-workspace records
continue using the compatibility approach.

Phase 31 comment records are also explicitly workspace-owned. Their related
entity is independently checked through the compatibility tenant key before
list or create, so the new collaboration record and the older core record must
both resolve inside the selected workspace boundary.

Phase 32 discussion-attention records are keyed by both member user id and
workspace id. They are personal read state for a workspace-owned thread.
Discussion alerts and delivery records remain personal to the recipient and
carry a verified workspace id only for safe context and navigation.

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

Workspace-shared operational context added in Phase 30:

- bounded recent activity for meaningful shared actions;
- actor attribution using member-visible identity;
- links back to affected shared surfaces.

Workspace-shared contextual discussion added in Phase 31:

- plain-text threads on datasets, comparison items, watchlist items, and
  portfolio items;
- verified actor attribution;
- member create access and author-only hard deletion.

Personal workspace-bound attention added in Phase 32:

- unread comment counts per member and thread;
- explicit discussion read state;
- peer-only, one-per-unread-cycle alerts;
- preference-controlled optional email/digest delivery.

Personal surfaces remain user-scoped because notification routing and saved
attention preferences are individual settings in this phase.

## Membership Bootstrap

Owners and admins can add an already registered user directly by email.
Owners may assign `admin` or `member`; admins may add only `member`. There is no
email invitation token or pending invitation lifecycle yet.

## Boundaries

Phase 29 did not add comments, chat, concurrent editing, task assignment,
approvals, custom roles, billing, shared notification policy, auction
execution, or ML/AI collaboration features.

Phase 31 adds bounded entity-linked comments only. It does not add chat,
realtime updates, rich text, mentions, attachments, reactions, comment editing,
tasks, approvals, or shared editing. The activity feed remains separate and is
not an immutable audit system.

Phase 32 adds bounded comment alerts, not shared notification policy, a team
inbox, push/SMS, presence, or realtime messaging.
