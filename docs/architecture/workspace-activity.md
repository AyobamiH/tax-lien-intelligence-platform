# Workspace Activity Architecture

Phase 30 adds a practical shared-awareness layer on top of the Phase 29
workspace boundary. It helps active members understand recent meaningful
changes without introducing chat, comments, realtime collaboration, or an
immutable compliance audit system.

## Model

`WorkspaceActivity` stores:

- workspace id;
- actor user id and safe email snapshot;
- category and allowlisted event type;
- related entity type/id;
- server-derived summary;
- bounded optional rendering metadata;
- occurrence and persistence timestamps.

The feed is queried by workspace id and sorted newest first. Category indexes
support the frontend's small data/decisions/portfolio/members filter set.

## Event Set

Recorded events:

- dataset uploaded;
- dataset scoring requested;
- dataset refresh requested when a new job is queued;
- comparison decision changed;
- comparison handed off to watchlist or portfolio when a target is created;
- portfolio status changed;
- workspace member added;
- workspace member role changed.

The recorder deliberately excludes reads, note contents, duplicate/no-op
handoffs, already-running refresh requests, raw errors, delivery internals, and
routine UI interactions.

## Attribution And Summaries

The API derives the actor from the verified bearer token. It resolves the
actor's registered email server-side and stores only the identity already
visible to workspace members through the member list.

Clients cannot submit summary text. The service builds concise summaries from
the event enum and bounded metadata. Control characters are removed and display
names are length-limited before summary construction.

## Authorization

`GET /workspaces/current/activity` runs after authentication and the existing
workspace-read middleware. A caller must be an active member of the selected
`X-Workspace-Id`. The store query always includes that verified workspace id.

Event creation occurs only after the associated role-authorized action
succeeds. Activity persistence is best effort: a feed write failure does not
rewrite the already-completed domain action. This makes the feed operational
history rather than a transactional or compliance guarantee.

## Relationship To Existing History

Comparison decision history remains the detailed item-level record for
decision/note changes and handoffs. Workspace activity is a broader,
member-visible summary across several product surfaces. Notes and note
snapshots are intentionally absent from workspace activity.

## Frontend

The `#/activity` page shows:

- actor email;
- safe event summary;
- occurrence timestamp;
- category tabs;
- links to an affected dataset or product surface where useful;
- loading, empty, and error states.

It uses a compact operational list, not social-feed or decorative timeline
styling.

## Deferred

Phase 30 does not add immutable retention, audit exports, before/after object
diffs, comments, mentions, tasks, approvals, websocket updates, or admin
compliance tooling.
