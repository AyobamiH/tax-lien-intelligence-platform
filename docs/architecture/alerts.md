# Alerts And Monitoring Architecture

Phase 9 adds the first user-visible monitoring layer on top of internal jobs.
It does not add email delivery, SMS, realtime websockets, external schedulers,
or background workers.

## Purpose

The app now has manual workflows and internal job execution records. Alerts make
important outcomes visible to the user:

- scoring completed;
- scoring failed;
- records are ready for review;
- a job needs attention.

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
- frontend alerts route using `#/alerts`;
- alert indicator in the app header and side navigation;
- unread/read state;
- links back to related datasets where safe;
- alert integration and review-model tests.

Not implemented:

- email/SMS delivery;
- push notifications;
- realtime websocket subscriptions;
- external background worker delivery;
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
- stable error code.

Alerts must not store raw job payloads, uploaded source rows, stack traces,
tokens, secrets, or provider payloads.

## Alert Sources

Current alert sources are job lifecycle events from the internal job service:

- completed `dataset_scoring` jobs create `scoring_job_completed`;
- failed `dataset_scoring` jobs create `scoring_job_failed`.

Alert recording is attached to job outcome handling. The job record remains the
source of execution truth; the alert is a user-facing visibility record.

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

## Frontend Surface

The current frontend alerts surface is deliberately small:

- unread count in navigation;
- dedicated alerts page;
- recent alert list;
- read/read-all controls;
- related dataset navigation when available;
- loading, empty, and error states.

It is not an operations center or admin dashboard.

## Drift Controls

Do not:

- use alerts as raw logs;
- store stack traces or source row data in alert metadata;
- add external delivery without a security review;
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
