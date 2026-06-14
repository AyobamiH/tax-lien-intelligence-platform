# Alerts And Monitoring Architecture

Phase 9 adds the first user-visible monitoring layer on top of internal jobs.
Phase 10 preserves those alerts while moving scoring execution into the worker
path. Phase 27 adds preference-aware email delivery/outbox handling for
supported product alerts. Phase 28 adds bounded scheduled digest processing and
owner-safe delivery history. Alerts still do not add SMS, push notifications,
realtime websockets, external schedulers, campaigns, or broad alert automation.
Phase 32 adds low-noise workspace comment attention alerts through the same
personal alert boundary.
Phase 38 adds low-noise alerts for consequential changes on deliberately
followed records.

## Purpose

The app now has manual workflows and internal job execution records. Alerts make
important outcomes visible to the user:

- scoring completed;
- scoring failed;
- records are ready for review;
- a job needs attention.
- a workspace discussion became unread for the current member.

Alerts should reduce uncertainty without creating noisy social-style
notifications.

## Current Implementation

Implemented:

- tenant-owned `Alert` Mongo model;
- alert store and service in `apps/api/src/alerts`;
- authenticated alerts router;
- `GET /alerts`;
- `PATCH /alerts/:alertId/read`;
- `PATCH /alerts/read-all`;
- alert creation from `dataset_scoring` job completion and failure;
- peer-only `workspace_comment_added` creation on the first unread transition;
- `workspace_item_assigned` alerts for direct responsibility changes;
- `followed_item_changed` alerts for allowlisted assignment, portfolio-status,
  and approval-resolution changes;
- notification preference classification for supported scoring alerts;
- email outbox tracking for suppressed, in-app-only, digest-ready,
  digest-processing, provider-disabled, failed, and sent delivery outcomes;
- immediate email delivery when preferences and SMTP env config allow it;
- tenant-owned digest batches with bounded per-user, per-window processing;
- authenticated owner-safe immediate-delivery and digest history;
- frontend alerts route using `#/alerts`;
- alert indicator in the app header and side navigation;
- unread/read state;
- workspace-aware links back to related datasets, comparison, watchlist, or
  portfolio where safe;
- alert integration and review-model tests.

Not implemented:

- SMS delivery;
- push notifications;
- realtime websocket subscriptions;
- user-configurable digest schedules, advanced templates, and automatic retries;
- scheduled alert generation;
- admin observability dashboard;
- alert rules engine.

## Data Model

Alert records store:

- `userId`;
- alert type;
- severity;
- read/unread status;
- safe message;
- optional related entity type/id;
- safe metadata;
- optional read timestamp;
- created/updated timestamps.

Current metadata is intentionally small:

- job id;
- dataset id;
- scored record count;
- stable error code;
- workspace id, comment id, and member-visible actor identity for discussion
  alerts.
- workspace id, stable follow event id, allowlisted change type, and verified
  actor identity for followed-item alerts.

Alerts must not store raw job payloads, uploaded source rows, stack traces,
tokens, secrets, or provider payloads.

## Alert Sources

Current alert sources are:

- completed `dataset_scoring` jobs create `scoring_job_completed`;
- failed `dataset_scoring` jobs create `scoring_job_failed`.
- peer comments create `workspace_comment_added` only when the recipient's
  thread transitions from read to unread.
- direct assignment creates `workspace_item_assigned` for the new assignee;
- consequential changes fan out `followed_item_changed` to active followers,
  excluding the actor and duplicate direct-assignment recipient.

Job alert recording is attached to outcome handling. Comment alert recording is
attached to the discussion-attention coordinator after comment persistence.
The source record remains authoritative; the alert is a user-facing visibility
record.
Follower alerts are best effort after the authoritative change and do not
expand record access.

## Service Boundaries

Current boundary:

- internal job service owns lifecycle transitions;
- alert service translates safe job outcomes into alert records;
- alert router exposes tenant-scoped read/acknowledge APIs;
- frontend renders summaries and read state.

Future event sources should call an application-level alert service rather than
writing arbitrary alert records directly from route handlers.

## Security Considerations

Alerts are user-owned workflow records and can reveal operational state. They
must be scoped to the authenticated user.

Current protections:

- authenticated alert routes;
- `userId` scoped alert reads and updates;
- cross-user alert acknowledgement tests;
- invalid id handling;
- safe metadata shape;
- no raw job internals in alert responses.

Future delivery channels need additional controls:

- recipient validation;
- template safety;
- opt-in/opt-out settings;
- delivery provider secret handling;
- bounce/error handling without leaking tenant data.

Phase 27 implements the first version of those controls for email only: the
recipient is resolved from the alert owner's user record, email content uses
bounded product-alert summaries, SMTP config is env-driven and disabled by
default, and duplicate sends are blocked through the delivery outbox source key.

## Frontend Surface

The current frontend alerts surface is deliberately small:

- unread count in navigation;
- dedicated alerts page;
- recent alert list;
- read/read-all controls;
- related dataset navigation when available;
- workspace-aware shared-record navigation for discussion alerts;
- loading, empty, and error states.

It is not an operations center or admin dashboard.

## Drift Controls

Do not:

- use alerts as raw logs;
- store stack traces or source row data in alert metadata;
- add SMS, push, or new external delivery providers without a security review;
- send marketing messages through product-alert infrastructure;
- add alert rules that bypass tenant ownership;
- imply realtime monitoring exists before it is implemented.

## Update Rules

Update this document when:

- alert types change;
- new alert sources are added;
- delivery channels are introduced;
- alert metadata changes;
- alert API contracts change;
- monitoring moves beyond the current user-facing surface.
