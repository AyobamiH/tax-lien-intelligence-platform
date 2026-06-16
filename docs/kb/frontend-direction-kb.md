# Frontend Direction KB

## What This File Governs

This file governs frontend direction: the intended role of the web app, future
page responsibilities, design tone, and UI drift risks.

It distinguishes current implemented frontend surface from future page
direction.

## Current Frontend Reality

Current implementation:

- React 19;
- Vite;
- TypeScript;
- Tailwind;
- authenticated review workspace in `apps/web/src/App.tsx`;
- browser login/register backed by the auth API;
- browser CSV upload form backed by `POST /datasets`;
- upload submitting, success, and error states;
- hash-based dataset review routes;
- API integration for dataset list/detail, scoring runs, controlled refresh,
  scoring status, maintenance status, and scored records;
- dataset import summary visibility for generic fallback and the current
  Maricopa-style import adapter;
- dataset readiness status, field coverage, issue, and guidance visibility;
- manual mapping repair controls for critical not-ready import fields;
- import profile reuse status and save/apply controls for repeated mapping
  workflows;
- scored-results table;
- record detail surface for flags and reasoning;
- watchlist keep/remove actions;
- dedicated watchlist comparison page;
- watchlist detail surface for flags and reasoning;
- portfolio track/untrack actions;
- watchlist-to-portfolio promotion actions;
- dedicated portfolio dashboard/status tracking page;
- portfolio status distribution, recent activity, needs-attention indicators,
  and status filtering;
- portfolio saved-view controls for saving and applying reusable status filters,
  built-in attention queue activation, active-view labeling, and default reset;
- portfolio detail surface for flags, reasoning, and status;
- compare actions from scored review, watchlist, and portfolio;
- dedicated comparison workspace;
- side-by-side comparison matrix;
- lightweight decision note editor;
- selected-item decision history timeline;
- selected-item handoff actions into watchlist and portfolio;
- scoring job queued/running/completed/failed visibility after a score run;
- refresh action/status visibility for scored datasets;
- maintenance mode/message visibility for scored datasets;
- alerts route with unread count and read/read-all actions;
- alert entries for scoring completion/failure, bounded discussion outcomes,
  direct responsibility assignments, and consequential followed-item changes;
- notification preferences route with controls for supported scoring and
  discussion, assignment, and followed-item alert types,
  enabled state, in-app-only versus email-capable handling, and timing;
- delivery history route with safe immediate and digest outcomes;
- workspace context, selected role, and read-only visibility in the header;
- workspace management route with member list, workspace selection,
  registered-user addition, owner-only role controls, role-aware removal,
  protected/restricted states, confirmation, and success/error feedback;
- workspace activity route with category tabs, actor attribution, timestamps,
  empty/error/loading states, and affected-surface navigation;
- reusable workspace discussion section on dataset, comparison, watchlist, and
  portfolio detail surfaces with plain-text rendering, attribution, timestamps,
  loading/empty/error states, creation, and author deletion;
- discussion unread indicators, explicit read clearing, and alert navigation
  that switches to the verified workspace before opening a shared surface;
- compact responsibility controls on dataset, comparison, watchlist, and
  portfolio detail surfaces; owners/admins may mutate responsibility while
  members see a clear restricted state;
- assigned-to-me route with loading, empty, error, refresh, and affected-surface
  navigation;
- comparison-detail approval request/status section for the supported
  comparison-to-portfolio checkpoint;
- focused approval queue with pending/resolved status filters, bounded context,
  reviewer rationale, owner/admin approve/reject actions, and requester
  cancellation;
- default my-work route with compact counts and bounded assigned, reviewable
  approval, unread discussion, and informational followed-record queues linked
  to existing surfaces;
- compact follow/unfollow controls with follower count on dataset, comparison,
  watchlist, and portfolio detail surfaces;
- compact required/optional review checklists on comparison, watchlist, and
  portfolio detail, plus owner/admin template management in the workspace
  surface;
- compact workspace policy switches for owners/admins with read-only policy
  visibility for members;
- policy-aware blocked-action feedback near comparison handoff and approval,
  while checklist readiness stays nonblocking when its policy is disabled;
- comparison-item decision brief surface with readiness, evidence sections,
  recent history/discussion, and copy/print controls;
- final outcome panels on comparison detail and decision brief surfaces with
  active/resolved state, resolver/timestamp, rationale display, and owner/admin
  outcome controls;
- loading, empty, and error states;
- no batch upload, drag-and-drop mega uploader, or live county sync.

## Intended Frontend Role

The frontend should become the operator workspace for reviewing tax lien and
parcel opportunities.

Its job is to:

- make noisy data understandable;
- show validation errors clearly;
- expose scores and reasoning;
- help users filter and inspect records;
- preserve watchlist and decision context;
- communicate risk without hype;
- keep shared operating data inside the selected verified workspace and
  personal settings private to the signed-in user.

## Future Page Inventory

Current and future page direction:

- implemented: login/register surface;
- implemented: dataset list/review surface;
- implemented: browser dataset upload form on the dataset surface;
- implemented: import readiness guidance on upload/list/detail surfaces;
- implemented: focused manual mapping repair panel on dataset detail;
- implemented: reusable import profile visibility and save/apply controls;
- implemented: dataset detail review route;
- implemented: scored records table;
- implemented: record detail reasoning surface;
- implemented: watchlist comparison surface;
- implemented: watchlist detail reasoning surface;
- implemented: portfolio status tracking surface;
- implemented: operational portfolio dashboard and summary surface;
- implemented: saved portfolio views and built-in attention queue surface;
- implemented: portfolio detail reasoning/status surface;
- implemented: comparison workspace with decision notes and lightweight
  decision history;
- implemented: explicit comparison handoff actions into watchlist/portfolio;
- implemented: scoring job status visibility and polling;
- implemented: controlled refresh action and scoring status badge;
- implemented: maintenance policy status display on dataset detail;
- implemented: alerts monitoring surface;
- implemented: notification preferences surface;
- implemented: delivery history surface;
- implemented: lightweight workspace/account-management surface;
- implemented: Phase 35 role-aware workspace administration and member
  deactivation controls;
- implemented: focused workspace activity surface;
- implemented: contextual workspace comment threads on four core record types;
- implemented: bounded discussion attention and comment alert workflow;
- implemented: current workspace responsibility and assigned-to-me workflow;
- implemented: focused comparison-to-portfolio approval request and reviewer
  workflow;
- implemented: member-focused my-work operational home and reviewer queue
  aggregation;
- implemented: stakeholder follow controls and informational followed-record
  queue;
- implemented: review checklist completion, template management, and bounded
  readiness visibility;
- implemented: fixed workspace policy visibility, role-aware administration,
  and explicit blocked-action requirement messaging;
- implemented: comparison-item decision brief/evidence pack surface;
- implemented: comparison-item final outcome resolution surface;
- future: broader personal account/settings page.

## Page Responsibilities

Future dashboard:

- summarize recent uploads;
- show scoring progress and dataset health;
- show refresh/staleness state when backend status exists;
- show watchlist count and important warnings;
- avoid fake metrics before real data exists.

Implemented upload surface:

- accept CSV files;
- send the selected file and optional source label through the authenticated
  dataset API;
- show server validation errors safely;
- show safe adapter/fallback import summaries after upload when backend support
- returns them;
- show safe readiness status, field coverage, and issue guidance returned by
  the backend;
- allow focused target-to-column repair for critical fields when readiness is
  weak, partial, or blocked;
- show whether a reusable import profile was not used, suggested, auto-applied,
  or user-applied;
- allow saving a repaired mapping as a tenant-owned profile;
- allow explicit application of a suggested profile;
- navigate into dataset review after a successful upload;
- prevent upload confusion;
- make weak or blocked imports visible before the user relies on scoring;
- never claim data was scored before backend confirms it.

Implemented scored table:

- show parcel identity, lien amount, estimated value, scores, flags, and status;
- support basic filtering and deterministic sorting;
- make risk visible;
- allow drill-down into reasoning.

Implemented watchlist:

- show user-selected opportunities;
- preserve why the user shortlisted the item;
- support dense comparison and remove actions.

Future watchlist expansion:

- tags;

Implemented portfolio:

- show actively tracked scored records;
- summarize total tracked, active, ready, and acquired items;
- show status distribution and allow status-filtered review;
- show recent additions and recent status changes;
- show conservative needs-attention indicators grounded in current status,
  flags, and confidence data;
- preserve why a record mattered originally;
- display and update simple status;
- support removal from active tracking.
- let users save and reopen practical portfolio work slices without rebuilding
  the same filter each time.
- expose attention queues as deterministic review aids, not urgency scores.

Future portfolio expansion:

- notes;
- tags;
- alerts;
- decision history beyond status timestamps;
- shared/team saved views;
- advanced reporting or BI dashboards;
- accounting or realized-return fields only after a separate domain phase.

Implemented comparison:

- show selected scored/watchlist/portfolio-linked candidates side by side;
- expose score, risk, liquidity, redemption, coverage, flags, reasoning, and
  note context in a dense matrix;
- allow a small decision state: undecided, keep reviewing, move forward, or
  rejected;
- allow bounded plain-text notes.
- show recent selected-item decision/note history in a compact, timestamped
  timeline.
- let users explicitly send comparison records into watchlist or portfolio and
  see whether the destination was created or already existed.

Future comparison expansion:

- multiple named comparison collections inside a workspace;
- richer decision history beyond the current lightweight timeline;
- collaboration;
- legal-grade audit trails;
- workflow boards or multi-step approval handoffs beyond the current focused
  checkpoint;
- task/project management;
- spreadsheet-style custom comparison builders.

Implemented alerts:

- show recent scoring job outcomes;
- expose unread/read state;
- link back to related datasets when available;
- avoid raw job payloads, stack traces, or internal logs.

Implemented notification preferences:

- show supported scoring alert categories;
- allow enabling/disabling each category;
- allow in-app-only versus email-capable handling;
- allow immediate versus digest-ready timing;
- explain that email sends only when provider env config is complete and that
  delivery-ready alerts are safely tracked otherwise.

Implemented delivery history:

- show immediate versus digest cadence;
- show sent, suppressed, failed, provider-disabled, waiting, and processing
  states;
- show digest batch item counts and attempts;
- show safe failure messages without raw provider errors or recipient emails;
- provide useful loading, empty, and error states.

Implemented workspace activity:

- show only meaningful shared operational actions;
- identify the member who performed the action;
- show a concise server-derived summary and occurrence time;
- filter by data, decisions, portfolio, or membership;
- navigate to the affected dataset or shared surface where useful;
- avoid social-feed styling, comments, reactions, presence, or notification
  wall behavior.

Implemented scoring execution visibility:

- show queued, running, completed, or failed state for score jobs;
- show refresh requested/running/failed/completed state for controlled refresh
  jobs;
- fetch scored records only after backend job completion;
- keep worker execution state understandable without exposing raw internals.

Future alerts expansion:

- SMS/push only after a separate security and product phase;
- richer digest cadence/customization only after product demand and security
  design justify it;
- richer event sources only when backend contracts exist.

## Design Tone

The product should feel:

- calm;
- dense enough for operators;
- trustworthy;
- practical;
- clear under data-heavy conditions.

It should not feel:

- like a toy dashboard;
- like a speculative trading app;
- like an AI magic demo;
- like a generic SaaS landing page replacing the real product.

## Density And Trust Principles

Tax lien review is data work. The UI should favor structured tables, clear
filters, stable layouts, readable numbers, and inspectable reasoning.

Large decorative layouts should not displace operational workflows.

Trust is created through:

- clear source labels;
- visible validation status;
- clear import/fallback status when a dataset was interpreted through an
  adapter;
- clear import readiness status and missing-field warnings;
- transparent scoring factors;
- visible execution status for score runs;
- consistent error states;
- no hidden magic;
- no claims that the system has not earned.

## Reasoning Visibility

Scores should eventually be accompanied by:

- flags;
- reasoning bullets;
- confidence warnings;
- missing-data indicators;
- hard disqualification messages.

The frontend must not reduce complex underwriting to a single unexplained badge.

## Loading, Empty, And Error States

Every future workflow should include:

- loading state;
- empty state;
- validation error state;
- network error state;
- permission/auth error state;
- upload failure state where relevant.

Empty states should guide the next action without pretending data exists.

## Lovable And Design Tool Constraints

If future design tooling such as Lovable is used, it must stay constrained by
repo truth:

- do not invent pages that do not have implementation priority;
- do not add mock data as if it were real;
- do not imply batch upload, SMS/push alert delivery, or automation workflows
  exist before they are wired to backend contracts;
- do not imply one county adapter means broad county import support;
- do not imply readiness status means every field can be remapped or edited;
- do not imply manual mapping is row-by-row editing or broad import automation;
- do not imply import profiles are global, AI-generated, or broad ETL
  automation;
- do not bypass shared API contracts;
- do not change product positioning away from decision support.

Design exploration is allowed, but production UI must be backed by real product
contracts.

## Security Expectations For Frontend Work

Future frontend work must:

- never trust client-side tenancy filtering as authorization;
- avoid exposing tokens or secrets;
- avoid storing sensitive data in local storage unless explicitly approved;
- handle auth errors cleanly;
- avoid rendering unescaped uploaded data;
- avoid treating readiness summaries as client-generated scoring truth;
- avoid mutating source rows in the browser when saving manual mapping;
- avoid treating import profile suggestions as authorization or source truth;
- avoid exposing one user's import profiles to another user's session;
- avoid leaking another user's records through cache or state reuse;
- avoid displaying internal server stack traces;
- render workspace comments as escaped text and never inject comment HTML.
- treat discussion unread state as user/workspace scoped and never infer access
  from a client-side alert link.
- treat assignment links as navigation hints only; the API must reverify
  workspace membership and target access.
- treat my-work counts and links as server-derived workspace-scoped summaries;
  never combine cached queues across workspace switches or infer access from a
  visible row.
- treat follow state as server-derived personal workspace data; remount or
  reload it on workspace changes and never infer record access from a stored
  subscription.
- treat checklist templates, completion, and readiness as server-derived
  workspace data; client toggles never grant target access or action authority.
- derive member-management and assignment-control states from server-provided
  workspace permissions; hidden or disabled controls are never authorization.

## What Must Not Be Overbuilt Too Early

Do not build:

- automation dashboards before upload, scoring review, and watchlist workflows
  exist;
- finance dashboards before the basic portfolio workflow earns them;
- admin consoles before user auth and tenancy are hardened;
- advanced filters before baseline table workflows exist;
- AI interfaces before deterministic scoring is credible.

## Drift Risks

Frontend drift risks:

- making marketing copy outrun product truth;
- building mock screens that look real;
- creating UI-only scoring concepts not backed by `packages/scoring`;
- creating county-specific UI promises not backed by tested import adapters;
- using local-only data instead of API contracts;
- ignoring error/empty states until late;
- weakening security by relying on hidden buttons instead of backend checks.

## Update Rules

Update this file when:

- frontend routing is introduced;
- a new page becomes real;
- design tone changes;
- app navigation changes;
- auth or data display boundaries change;
- future pages graduate to implemented surface.
