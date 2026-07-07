# Follow-Up Reminder Architecture

Phase 44 adds a bounded time-aware follow-through layer for operational
records. It helps members see what should be reviewed soon without turning the
product into a task manager or calendar suite.
Phase 45 adds explicit completion and snooze controls so members can resolve or
defer reminders without leaving them endlessly open.

## Scope

Implemented targets:

- comparison items;
- watchlist items;
- portfolio items.

Dataset-wide reminders, recurring schedules, calendar sync, SLA scoring,
workforce planning, and auction execution remain out of scope.

## Persistence

`packages/db/src/models/follow-up.ts` stores one active follow-up per
workspace/target pair. Records include:

- workspace id;
- target entity type/id;
- due date;
- optional bounded note;
- creator/updater ids;
- optional current assignee id snapshot;
- reminder state and last reminder timestamp;
- optional cleared timestamp/actor;
- optional completed timestamp/actor;
- optional snoozed timestamp/actor and previous due date;
- created/updated timestamps.

The unique workspace/target key prevents parallel follow-ups for the same
record in this first version.

## Service Boundary

`FollowUpService` owns validation, target access, state calculation, activity
recording, queue aggregation, and reminder scan behavior.

The service accepts only allowlisted target types. It reuses the existing shared
target-access adapter and workspace assignment service rather than trusting
client-provided ownership, workspace, assignee, or target metadata.

Due-state rules are deliberately simple:

- future day: `upcoming`;
- same UTC day or due earlier today: `due`;
- before today: `overdue`;
- completed follow-up: `completed`;
- cleared follow-up: `cleared`;
- missing follow-up: `none`.

Dates more than one year in the future are rejected. Notes are plain text,
trimmed, and bounded.

## API Surface

`apps/api/src/routes/follow-ups.ts` exposes:

- `GET /follow-ups/queue`;
- `GET /follow-ups/:entityType/:entityId`;
- `PUT /follow-ups/:entityType/:entityId`;
- `POST /follow-ups/:entityType/:entityId/complete`;
- `POST /follow-ups/:entityType/:entityId/snooze`;
- `DELETE /follow-ups/:entityType/:entityId`.

Routes require authentication plus selected-workspace membership. Mutations use
workspace write access. Responses are structured DTOs from `packages/types`.

## Reminders And Alerts

The worker creates the same service graph as the API and registers
`follow-up-reminder-scan` with the internal scheduler. The interval is
configured by `FOLLOW_UP_REMINDER_INTERVAL_MS`.

The scan finds due/overdue active follow-ups, revalidates target access, and
creates a `follow_up_due` alert through `AlertService`. Notification
preferences and delivery preparation then decide whether the alert stays
in-app, becomes immediate email, or enters digest processing.

Duplicate suppression is based on the last reminded due state. This means a
record can alert once when due and once again if it later becomes overdue, but
it does not repeatedly alert on every scheduler tick.
Completing a follow-up removes it from future scans. Snoozing sets a new due
date, records the prior due date, resets reminder state to `none`, and defers
future alert generation until the new date becomes due.

## My Work And Frontend

`MyWorkService` includes follow-ups as an actionable queue when
`FollowUpService` is available. The frontend exposes compact follow-up controls
on comparison, watchlist, and portfolio detail panels, then surfaces upcoming
and overdue follow-ups in `#/my-work`.

The UI stays operational: one date input, one note field, update, complete,
snooze, and clear actions, due-state labels, and navigation back to the owning
record. It does not expose a calendar, recurrence builder, board, or workload
planner.

## Activity

Setting or clearing a follow-up records a bounded workspace activity event:

- `follow_up_set`;
- `follow_up_cleared`;
- `follow_up_completed`;
- `follow_up_snoozed`.

Activity metadata includes only safe ids, due-state/date, and a note presence
flag. It does not copy follow-up notes into the activity feed.

## Runtime Smoke

`npm run smoke:mongo` provides a bounded Mongo-backed follow-up workflow smoke.
It builds the workspace, connects to `MONGODB_URI` using a unique temporary
database name, starts the API app in-process, sets a due follow-up through the
authenticated API, verifies the My Work queue, runs the scheduler reminder
service, confirms one `follow_up_due` alert with duplicate suppression,
completes the follow-up and confirms reminder suppression, snoozes it to a new
future due date with prior-date context, confirms reminder deferral and reset
state, emits one new due reminder after the snoozed date, clears the follow-up,
and drops only the temporary smoke database.

This is local runtime evidence for the follow-up reminder path. It is not
deployed proof, browser-driver screenshot evidence, production data validation,
or a recurring task platform.

## Security

Follow-ups are workspace-scoped operational data.

Controls:

- selected-workspace membership is required;
- target access is rechecked for every read, mutation, queue item, and
  scheduled reminder;
- assignee/creator recipient resolution stays server-side;
- stale or inaccessible targets are omitted from queues and skipped by the
  scheduler;
- alert metadata is allowlisted and contains no record contents or notes;
- notification preferences remain personal to the recipient.

## Drift Controls

Do not expand this layer into:

- arbitrary task objects;
- recurring reminder engines;
- calendar integrations;
- SLA escalation products;
- kanban/workforce planning;
- auction execution;
- AI scheduling.

Future expansion should add target support only when each entity has explicit
access checks, product need, UI placement, and tests.
