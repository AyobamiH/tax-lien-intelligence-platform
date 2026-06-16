# Current Surface KB

## What This File Governs

This file governs the visible and callable product surface that exists today. It
prevents future contributors from mistaking planned flows for implemented flows.

It does not define long-term page design or API schemas. Use frontend, backend,
and shared contract KBs for those.

## Current User-Visible Web Surface

The current web surface is a React review workspace rendered by
`apps/web/src/App.tsx`.

It shows:

- browser login/register controls backed by the auth API;
- authenticated browser CSV upload form;
- upload submitting, success, and error states;
- authenticated dataset list;
- dataset detail route using `#/datasets/:datasetId`;
- dataset import summary visibility for generic CSV fallback or the current
  Maricopa-style county import adapter;
- dataset readiness status, field coverage, warnings, and guidance for uploaded
  datasets;
- focused manual mapping repair controls for critical fields on not-ready
  datasets;
- reusable import profile status plus save/apply actions for repeated mapping
  workflows;
- scoring action for a selected dataset;
- controlled refresh action for a scored dataset;
- scoring freshness/status badge and stale-record count;
- maintenance mode and safe policy message for scored datasets;
- scoring job queued/running/completed/failed status while the worker processes
  the selected dataset;
- scored-results table;
- scored-record enrichment/data-quality detail;
- safe external enrichment detail when Census geocoding is enabled and a row
  has usable address context;
- enrichment adapter outcome and freshness/reprocess timing detail;
- row-level detail surface with flags and reasoning;
- watchlist keep/remove actions for scored records;
- dedicated watchlist comparison route using `#/watchlist`;
- watchlist detail surface with flags and reasoning;
- portfolio track/untrack actions for scored records;
- watchlist-to-portfolio promotion actions;
- dedicated portfolio route using `#/portfolio`;
- portfolio dashboard with status distribution, recent additions, recent status
  changes, conservative needs-attention indicators, status filtering, flags,
  reasoning, and status controls;
- portfolio saved-view controls for saving reusable status filters, applying
  saved views, activating the built-in needs-attention queue, and returning to
  the default view;
- compare actions from scored review, watchlist, and portfolio surfaces;
- dedicated comparison route using `#/comparison`;
- side-by-side comparison matrix with decision state and lightweight notes;
- selected comparison item history for recent decision/note changes;
- selected comparison item handoff actions into watchlist and portfolio;
- dedicated alerts route using `#/alerts`;
- unread alert count and alert read/read-all actions;
- dedicated notification preferences route using `#/notifications`;
- notification controls for supported scoring, discussion, assignment, and
  followed-item alert types, enabled state,
  in-app-only versus email-capable handling, and immediate versus digest-ready
  timing;
- dedicated delivery history route using `#/delivery-history`;
- immediate email and digest batch status, attempts, suppressions, failures,
  provider-disabled state, and safe related-dataset navigation;
- workspace context and role visibility in the app header;
- dedicated workspace activity route using `#/activity`;
- recent meaningful activity with actor email, safe summary, timestamp,
  category filters, and links to affected product surfaces;
- contextual workspace discussion on dataset, comparison item, watchlist item,
  and portfolio item detail with actor, timestamp, create, and author-delete
  states;
- per-thread unread discussion counts, explicit read clearing, and
  workspace-aware discussion alert navigation;
- responsibility controls on dataset, comparison, watchlist, and portfolio
  detail surfaces, with assignment mutation limited to owners/admins and clear
  member-restricted states;
- dedicated assigned-to-me route using `#/assignments`;
- default member-focused my-work route using `#/my-work`, with assignment,
  reviewable approval, unread discussion, and followed-record counts plus
  compact navigation queues;
- follow/unfollow controls and active follower count on dataset, comparison,
  watchlist, and portfolio detail surfaces;
- a separate informational Following queue in My Work;
- compact review checklists on comparison, watchlist, and portfolio detail,
  with required/optional labels, completion attribution, and readiness progress;
- workspace checklist-template management for owners/admins, with member
  read-only visibility;
- workspace policy visibility and owner/admin switches for assignment,
  checklist-readiness, and portfolio-approval gates;
- policy-aware comparison handoff and approval messages that identify unmet
  requirements and their resolutions;
- comparison-item decision brief route using
  `#/decision-briefs/comparison_item/:entityId`, with consolidated evidence,
  readiness gates, recent context, and copy/print controls;
- checklist readiness remains informational unless the workspace explicitly
  enables its checklist policy;
- comparison-detail approval request/status visibility for the supported
  comparison-to-portfolio checkpoint;
- dedicated approval queue using `#/approvals`, with pending/resolved filters,
  requester/reviewer context, rationale, and role-aware
  approve/reject/cancel controls;
- dedicated workspace management route using `#/workspace`;
- active member list, workspace switching, direct registered-user addition,
  owner-only role controls, role-aware removal/deactivation controls, protected
  owner state, and action feedback;
- loading, empty, and error states.

This is the first real user-facing review and decision-tracking workflow. It is
now also includes a practical browser upload path. It is not a batch import,
live county sync, or automation workspace.

## Current API Surface

The current API surface is minimal:

- `GET /healthz`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /workspaces`
- `GET /workspaces/current`
- `GET /workspaces/current/members`
- `POST /workspaces/current/members`
- `PATCH /workspaces/current/members/:membershipId`
- `DELETE /workspaces/current/members/:membershipId`
- `GET /workspaces/current/activity`
- `GET /comments/:entityType/:entityId`
- `POST /comments/:entityType/:entityId`
- `PATCH /comments/:entityType/:entityId/read`
- `DELETE /comments/:commentId`
- `GET /assignments/mine`
- `GET /assignments/:entityType/:entityId`
- `PATCH /assignments/:entityType/:entityId`
- `DELETE /assignments/:entityType/:entityId`
- `GET /approvals`
- `POST /approvals`
- `GET /approvals/:approvalRequestId`
- `POST /approvals/:approvalRequestId/approve`
- `POST /approvals/:approvalRequestId/reject`
- `POST /approvals/:approvalRequestId/cancel`
- `GET /my-work`
- `GET /follows`
- `GET /follows/:entityType/:entityId`
- `PUT /follows/:entityType/:entityId`
- `DELETE /follows/:entityType/:entityId`
- `GET /review-checklists/templates`
- `PUT /review-checklists/templates/:entityType`
- `GET /review-checklists/:entityType/:entityId`
- `PATCH /review-checklists/:entityType/:entityId/items/:itemId`
- `GET /workspace-policies`
- `PUT /workspace-policies`
- `GET /decision-briefs/comparison_item/:entityId`
- `POST /datasets`
- `GET /datasets`
- `GET /datasets/:datasetId`
- `GET /datasets/import-profiles`
- `GET /datasets/:datasetId/mapping`
- `PATCH /datasets/:datasetId/mapping`
- `POST /datasets/:datasetId/import-profile`
- `POST /datasets/:datasetId/import-profile/apply`
- `POST /datasets/:datasetId/score`
- `POST /datasets/:datasetId/refresh`
- `GET /datasets/:datasetId/scoring-status`
- `GET /datasets/:datasetId/scores`
- `GET /jobs/:jobId`
- `GET /alerts`
- `PATCH /alerts/:alertId/read`
- `PATCH /alerts/read-all`
- `GET /notification-preferences`
- `PATCH /notification-preferences`
- `GET /notification-deliveries`
- `POST /watchlist`
- `GET /watchlist`
- `DELETE /watchlist/:watchlistItemId`
- `POST /portfolio`
- `GET /portfolio`
- `GET /portfolio/summary`
- `GET /portfolio/:portfolioItemId`
- `PATCH /portfolio/:portfolioItemId`
- `DELETE /portfolio/:portfolioItemId`
- `POST /comparison`
- `GET /comparison`
- `PATCH /comparison/:comparisonItemId`
- `GET /comparison/:comparisonItemId/history`
- `POST /comparison/:comparisonItemId/handoff/watchlist`
- `POST /comparison/:comparisonItemId/handoff/portfolio`
- `DELETE /comparison/:comparisonItemId`
- `POST /saved-views`
- `GET /saved-views`
- `GET /saved-views/:savedViewId/apply`
- `PATCH /saved-views/:savedViewId`
- `DELETE /saved-views/:savedViewId`
- structured JSON 404 for unknown routes

Documented in:

- `docs/api/health.md`
- `docs/api/auth.md`
- `docs/api/datasets.md`
- `docs/api/scoring.md`
- `docs/api/jobs.md`
- `docs/api/alerts.md`
- `docs/api/notification-preferences.md`
- `docs/api/notification-deliveries.md`
- `docs/api/watchlist.md`
- `docs/api/portfolio.md`
- `docs/api/comparison.md`
- `docs/api/saved-views.md`
- `docs/api/workspaces.md`
- `docs/api/comments.md`
- `docs/api/assignments.md`
- `docs/api/approvals.md`
- `docs/api/review-checklists.md`

There is no standalone parcel API yet.

## Review Surface Versus Remaining Shell Areas

The current browser surface has moved past a pure shell for scoring review.
It still keeps the surrounding product deliberately narrow.

Real workflows now present:

- browser-based account registration;
- browser-based login;
- browser-based single CSV dataset upload through the authenticated API;
- dataset list/detail review for authenticated users;
- safe county import/fallback summary visibility on dataset list/detail;
- safe import readiness visibility on dataset list/detail;
- manual mapping repair for key fields from dataset headers;
- saving a repaired mapping as a private reusable import profile;
- auto-applied/suggested import profile visibility on dataset detail;
- explicit suggested-profile application;
- score triggering for a selected dataset;
- controlled refresh/reprocessing for a selected dataset;
- visible scoring job completion state after a scoring run;
- visible refresh requested/running/failed/completed state;
- visible manual-only versus policy-auto-refresh maintenance state;
- background scoring status polling after a scoring run is requested;
- scored-record table;
- record-level flags and reasoning review.
- enrichment and data-quality context for scored records.
- add/remove watchlist actions;
- watchlist shortlist comparison.
- portfolio tracking and status updates.
- portfolio dashboard review with status distribution, recent activity,
  needs-attention signals, and filtered tracked decisions.
- saved portfolio views and built-in attention queues for reusable operational
  work slices.
- comparison workspace, decision state, and lightweight notes.
- in-app alert review for scoring outcomes, bounded workspace discussion,
  assignments, and followed-item changes.
- notification preference management for scoring, discussion, assignment, and
  followed-item alert types.
- import readiness review before relying on score output.
- focused import repair before rerunning readiness/scoring.
- deterministic import profile reuse for repeated upload shapes.
- deterministic saved views for repeated portfolio review filters.
- notification preferences for controlling in-app-only versus email-capable
  scoring, discussion, assignment, and followed-item alerts.
- env-driven immediate product-alert email for supported alerts when SMTP
  config is complete.
- scheduled digest processing and owner-scoped delivery history.
- workspace-shared recent activity for meaningful operational changes.
- workspace-shared, entity-linked plain-text comments for bounded operational
  discussion.
- member-specific unread discussion attention with one alert per unread cycle.
- explicit current responsibility plus a personal assigned-to-me queue for four
  shared record types.
- a personal operational home aggregating assignments, approvals awaiting the
  actor's decision, and unread accessible discussions without creating tasks.

Real workflows not present:

- settings;
- SMS/push alert delivery;
- realtime alerts.
- realtime chat, rich text, mentions, attachments, push/SMS, and realtime
  comment delivery.

## Current Visual Signals

Current visual signals:

- restrained color palette;
- product-oriented copy;
- simple card grid;
- no marketing-heavy hero graphics;
- operator-like language around decisions.

The visual system is early. It should not be treated as a complete design system.

## Current Limitations

The current frontend cannot:

- batch upload multiple files;
- manually remap columns beyond the focused critical-field repair workflow;
- edit individual row values or spreadsheet cells;
- run automation.
- configure scheduled maintenance policy.
- run unlimited automatic recurring refresh.
- manage county-wide shared import profile catalogs or live county sync.
- share import profiles globally or edit profile rules in a full management
  console.
- build arbitrary saved reports, shared/team views, or spreadsheet exports.

The current API cannot:

- provide a standalone parcel/lien row API;
- persist user-owned parcel records outside scored-record outputs;
- deliver SMS/push alerts;
- provide realtime worker status;
- show external enrichment/provider verification;
- perform broad scheduled refresh or sync;
- expose a user-facing scheduler console;
- provide broad county adapter coverage or scraping;
- provide a full spreadsheet transformation workflow;
- provide chat, rich-text comments, mentions, task approvals, multi-step
  approval chains, realtime collaboration,
  compliance-grade audit exports, or auction execution.
- provide due dates, SLA queues, workload balancing, urgency scoring, or a
  generic task-management dashboard.
- run arbitrary saved-view query expressions or BI/report-builder workflows.
- send SMS/push alerts or realtime notifications.

## Where The Current Surface Could Mislead Contributors

The review, upload, watchlist, and portfolio surfaces could make future
contributors think automation workflows also exist. They do not.

The portfolio dashboard could make contributors think financial analytics,
return tracking, BI reporting, or predictive portfolio insights exist. They do
not. The current dashboard is an operational summary over existing portfolio
items only.

Saved views could make contributors think reporting or shared workspaces exist.
They do not. Current saved views are private operational filters and built-in
queues over existing portfolio/comparison data only.

Notification preferences could make contributors think every delivery channel
exists. They do not. Current notification preferences control in-app alert
generation, immediate email eligibility when SMTP config is complete, and
scheduled digest delivery. Delivery history exposes safe outcomes without
recipient addresses or raw provider errors.

The presence of browser auth, score review, and worker-backed scoring could make
contributors think the whole V1 app is implemented. It is not: batch upload,
settings, SMS/push delivery, marketing campaigns, and broader product automation
are still future work.

The presence of a dataset model could make contributors think full parcel
ingestion exists. It does not.

The presence of one Maricopa-style import adapter could make contributors think
broad county-specific import coverage exists. It does not. The current browser
surface only exposes safe adapter/fallback summary metadata.

The presence of readiness status could make contributors think manual mapping or
data correction exists. Focused manual mapping now exists, but it is limited to
target-to-column repair metadata. It is not row editing or source data mutation.

The presence of import profiles could make contributors think broad import
automation exists. It does not. Profiles are private, deterministic,
target-to-column mapping reuse. There is no global profile catalog, ML mapping
suggestion engine, live sync, or ETL rule builder.

## Security Implications

The current browser surface now handles authenticated workspace-shared upload
and review data plus personal messaging/settings data. Security risk shifts
toward protecting the token boundary, selected-workspace membership,
role-aware authorization, tenant-key derivation, and file upload behavior.
Risk increases
further when the repo adds:

- batch upload or raw file persistence workflows;
- alert or automation workflows.

Datasets, scores/jobs, watchlist, portfolio, comparison, decision history, and
handoff are shared only inside a verified workspace. Owners/admins can mutate;
members are read-only. Existing record `userId` values remain the workspace
owner compatibility key and are never client supplied. Alerts, notification
settings/history, and saved views remain personal. Future changes must preserve
both boundaries.

Workspace administration is also server-authorized. Owners can change
non-owner roles and remove admins/members; admins can add/remove regular
members only; members cannot administer access. Deactivated memberships are
excluded from workspace resolution immediately. This is a minimal role model,
not enterprise IAM.

Workspace activity is also shared only inside verified membership. It contains
server-derived summaries and member-visible actor identity, never note text,
raw errors, source rows, or personal notification activity. It is operational
history, not a guarantee of immutable audit completeness.

Alerts are now user-owned monitoring records. They expose safe summaries only and
must not become raw logs or stack-trace displays. Future current-surface updates
must record both visible functionality and trust boundaries.

Dataset import summaries are also safe display metadata. They must not grow into
raw source-row previews, parser internals, or county identity claims based only
on user-provided labels.

Dataset readiness summaries are backend-computed safe metadata. They must not
become raw row previews, client-side scoring, or a substitute for server-side
ownership checks.

Dataset manual mappings are backend-validated safe metadata. They must not
become arbitrary browser-side row transforms or a way to bypass scoring
validation.

Dataset import profiles are tenant-owned configuration. They must not leak
mapping knowledge across users, silently rewrite source rows, or imply that a
filename/source label proves county identity.

## Update Rules

Update this file whenever:

- a new page becomes user-visible;
- a new API route is added;
- a shell element becomes a real workflow;
- auth/protected routes are introduced;
- current limitations change.
