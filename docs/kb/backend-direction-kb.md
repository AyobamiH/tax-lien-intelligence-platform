# Backend Direction KB

## What This File Governs

This file governs backend direction: API responsibilities, service boundaries,
validation philosophy, error philosophy, and implementation order.

It does not define exact endpoint schemas. Endpoint schemas belong in `docs/api`
and shared DTO types.

## Current Backend Reality

Current implementation:

- Express app factory;
- Helmet middleware;
- CORS middleware;
- JSON body limit of `1mb`;
- `GET /healthz`;
- user model;
- `POST /auth/register`;
- `POST /auth/login`;
- `GET /auth/me`;
- password hashing;
- JWT issuance and verification;
- auth middleware;
- workspace and workspace-membership models;
- personal owner-workspace bootstrap;
- workspace/member list, add-member, owner-only role-update, and role-aware
  deactivation APIs;
- workspace activity model, recorder, and membership-protected retrieval API;
- workspace comment model, entity-target access adapter, and
  membership-protected list/create/read-state/delete API;
- discussion-attention model and service keyed by user, workspace, and thread;
- workspace-assignment model and service with one current assignee per
  supported shared record;
- approval-request model and service for the allowlisted
  comparison-to-portfolio checkpoint;
- my-work aggregation service over existing assignment, approval, discussion
  attention, follow, membership, and target-access boundaries;
- follow-subscription model, store, service, and routes for four allowlisted
  shared record types;
- review-checklist template and record-instance models, stores, service, and
  routes for comparison, watchlist, and portfolio records;
- fixed workspace-policy model, store, evaluator, and authenticated
  retrieval/update routes;
- decision-brief aggregation service and authenticated route for comparison
  items, reusing existing target, assignment, checklist, approval, comment,
  policy, dataset, and history boundaries;
- decision-outcome model, store, service, and authenticated routes for
  comparison-item active/resolved state and owner/admin final resolution;
- outcome-review aggregation service and authenticated read-only route for
  workspace-level final outcome summaries, recent resolution windows, and
  grounded retrospective signals;
- follow-up model, store, service, and authenticated routes for bounded
  follow-up dates, completion, and snooze/reschedule control on comparison,
  watchlist, and portfolio records;
- scheduler-driven follow-up reminder scan that emits bounded `follow_up_due`
  alerts through existing notification preferences and delivery infrastructure;
- selected-workspace membership middleware and explicit read/write,
  member-management, member-removal, role-management, approval-review, and
  sensitive-action checks;
- global API error handling;
- high-severity npm audit enforcement in CI and pre-push, with frontend
  compiler/build packages separated from runtime dependencies;
- dataset model;
- authenticated dataset upload/list/detail routes;
- CSV upload handling;
- CSV validation and dataset ownership enforcement;
- county import adapter boundary for uploaded CSV rows;
- first Maricopa-style tax lien CSV adapter with generic fallback;
- safe import summary metadata on dataset responses;
- dataset readiness summary with canonical field coverage, issues, score,
  scoring recommendation, and guidance;
- dataset manual mapping summary and repair endpoints for focused critical
  field repair;
- tenant-owned import profile model and reusable mapping endpoints;
- deterministic import profile matching during upload;
- internal dataset source rows for scoring;
- scored-record model;
- internal job model;
- enrichment service and source-field inference adapter;
- deterministic scoring package integration;
- authenticated score run and score retrieval routes;
- score runs routed through queued internal jobs and the worker execution path;
- authenticated job detail route;
- dedicated worker entrypoint;
- minimal scheduler module;
- alert model;
- authenticated alert list/read/read-all routes;
- scoring job completion/failure alert creation;
- notification preference model;
- notification delivery outbox model;
- notification digest batch model;
- authenticated notification preference get/update routes;
- preference-driven scoring/discussion/assignment/followed-item/follow-up alert
  suppression and delivery classification;
- provider-agnostic delivery-preparation metadata for supported alerts;
- env-driven SMTP email transport boundary;
- preference-aware immediate email delivery for supported product alerts when
  SMTP config is complete;
- provider-disabled, failed, sent, suppressed, in-app-only, and digest-ready
  delivery outbox tracking;
- scheduled digest processing through the existing worker scheduler;
- atomic digest batch/outbox claim behavior and current-preference rechecks;
- authenticated owner-scoped delivery history retrieval;
- scheduled maintenance service for stale scored-record scans;
- `dataset_maintenance` job type for policy-driven maintenance decisions;
- policy-created `dataset_scoring` refresh jobs with
  `requestKind: "policy_refresh"`;
- scoring ownership enforcement;
- frontend score review surface consumes the scoring API;
- watchlist item model;
- authenticated watchlist add/list/remove routes;
- watchlist ownership enforcement against scored records;
- duplicate-safe watchlist adds;
- portfolio item model;
- authenticated portfolio add/list/summary/detail/status/delete routes;
- portfolio ownership enforcement against scored records and watchlist items;
- duplicate-safe portfolio adds;
- simple portfolio status model;
- tenant-scoped portfolio summary aggregation;
- comparison item model;
- authenticated comparison add/list/update/delete routes;
- comparison ownership enforcement against scored records, watchlist items, and
  portfolio items;
- duplicate-safe comparison adds;
- bounded lightweight notes;
- decision history model;
- authenticated comparison history retrieval route;
- server-side comparison decision/note history capture;
- explicit comparison handoff routes for watchlist and portfolio;
- server-side handoff history capture with destination linkage metadata;
- workspace-aware access for datasets, scoring/jobs, import profiles,
  watchlist, portfolio, comparison, decision history, and handoff;
- focused actor-attributed activity capture for meaningful shared actions;
- workspace-owned plain-text comments on datasets, comparison items, watchlist
  items, and portfolio items with member creation and author-only hard delete;
- peer-only comment notification fan-out with self-notification exclusion,
  unread accumulation, and one alert per unread cycle;
- assignment get/reassign/clear and assigned-to-me APIs with active-assignee
  validation, owner/admin mutation enforcement, no-op handling, responsibility
  activity, and new-assignee-only notification;
- approval create/list/detail/approve/reject/cancel APIs with duplicate-pending
  protection, self-review prevention, requester-only cancellation,
  stale-target revalidation, and workspace-qualified lookup;
- authenticated my-work retrieval with reviewer filtering, unread discussion
  aggregation, followed-record listing, follow-up queueing, stale-target
  omission, and bounded queue previews;
- authenticated follow state/create/delete/list behavior with duplicate-safe
  persistence, selected-workspace scoping, and target-access validation;
- bounded follower notification fan-out for assignment changes, portfolio
  status changes, and approval resolution;
- owner/admin checklist-template management, active-member completion,
  target-access revalidation, version synchronization, and required readiness;
- owner/admin workspace-policy management, member-readable policy state,
  default-off compatibility, and structured selected-action gate failures;
- read-only decision brief retrieval that consolidates comparison evidence
  without persisting reports, bypassing policy, or exposing cross-workspace
  records;
- final decision outcome resolution with one current outcome per comparison
  item, resolver attribution, required rationale, approved-outcome governance
  checks, and bounded workspace activity;
- outcome review retrieval with stale-target omission, current comparison
  access filtering, status/entity grouping, and no predictive or financial
  modeling layer;
- follow-up creation/update/clear/complete/snooze and personal queue retrieval
  with date validation, selected-workspace membership, target access
  revalidation, stale-target omission, completed-record suppression, snooze
  deferral, and duplicate reminder suppression by due state;
- saved view model;
- authenticated saved-view create/list/apply/update/delete routes;
- server-side validation for saved portfolio/comparison criteria;
- built-in attention queues grounded in current portfolio/comparison data;
- structured 404;
- startup connects to MongoDB;
- env parsing with `zod`;
- no standalone parcel/lien models.

The Phase 34 dependency audit found no vulnerable package in an API request
path. The reported Vite/esbuild chain was development/build tooling, was
upgraded to fixed versions, and now resolves cleanly in both full and
production-only npm audits.

## Intended Backend Role

The backend should become the trusted boundary for:

- authentication;
- workspace and personal tenant identity;
- membership and role authorization;
- dataset ingestion;
- validation;
- normalized storage;
- scoring orchestration;
- internal job orchestration;
- watchlist persistence;
- portfolio tracking persistence;
- comparison workspace persistence;
- decision history persistence;
- decision handoff orchestration;
- saved operational view persistence;
- in-app alert persistence;
- notification preference persistence;
- workspace operational activity persistence;
- workspace contextual discussion persistence;
- personal workspace-bound discussion attention persistence;
- workspace responsibility assignment persistence;
- workspace approval checkpoint persistence and resolution;
- member-focused operational queue aggregation without new task persistence;
- personal workspace follow-subscription persistence and bounded stakeholder
  notification fan-out;
- workspace review-template and record checklist persistence without treating
  completion as compliance evidence;
- read-only evidence-pack aggregation for supported decision records without
  becoming a public reporting or compliance-custody system;
- internal final-outcome persistence for supported decision records without
  becoming legal case management or downstream settlement tracking;
- read-only retrospective aggregation over recorded outcomes without becoming
  BI, predictive analytics, or financial reporting;
- bounded follow-up reminder persistence and scheduler-driven alerting for
  supported records without becoming a task/calendar/SLA system;
- workspace membership administration and inactive-membership lifecycle;
- future compliance-grade audit events;
- security enforcement.

The backend must not rely on frontend behavior for authorization.

## Auth Implementation

Phase 2 introduced:

- user model;
- registration endpoint;
- login endpoint;
- password hashing;
- JWT issuance;
- JWT verification middleware;
- `GET /auth/me`;
- protected-route tests;
- duplicate email handling;
- invalid/malformed payload handling;
- expired/invalid token handling.

Security requirement:

- server derives the authenticated user from the verified token;
- client-supplied `userId` is never trusted.

Future auth hardening may add password reset, email verification, refresh-token
rotation, or MFA, but those are not current scope.

## Dataset Implementation

The dataset foundation now exists. A dataset belongs to exactly one user and
captures upload metadata and validation outcome.

Current backend responsibilities:

- validate file presence;
- validate file type/size;
- parse CSV safely;
- apply the current county import adapter boundary when headers match explicit
  evidence;
- reject empty or malformed CSVs;
- record validation summaries;
- record safe import summaries;
- record safe readiness summaries;
- validate and record safe manual mapping summaries;
- avoid persistence on unsafe parse failures;
- associate every stored dataset with `userId`.

Future backend responsibilities:

- normalize parcel/lien rows;
- add tested county adapters behind the existing import adapter boundary;
- validate required domain fields;
- handle duplicate parcel identities;
- persist row-level records safely.

## Scoring Implementation

The backend now calls the pure scoring package rather than embedding scoring
logic directly in route handlers.

The scoring package is deterministic and independently tested. The API persists
score outputs with reasoning, flags, and safe enrichment metadata in
tenant-owned scored records. Scoring runs now execute through a persisted
internal `dataset_scoring` job that is claimed and processed by the worker.

Current scoring API:

- `POST /datasets/:datasetId/score`;
- `POST /datasets/:datasetId/refresh`;
- `GET /datasets/:datasetId/scoring-status`;
- `GET /datasets/:datasetId/scores`.

The scoring trigger now returns queued job metadata. The refresh trigger queues
or reuses a dataset scoring job with `requestKind: "refresh"`. The frontend
polls job state and fetches scores after the worker completes the job.

Current limitation:

- scoring is first-pass and conservative;
- enrichment now includes uploaded source-row inference plus an opt-in Census
  Geocoder adapter for address normalization/location context;
- county import now includes one Maricopa-style CSV adapter before generic
  normalization and scoring;
- no broad external provider coverage or final underwriting model exists yet.

## County Import Adapter Implementation

Phase 16 adds a dataset import adapter boundary after safe CSV parsing and
before dataset persistence. The current adapter list is intentionally small:

- `maricopa_tax_lien_v1` for Maricopa-style tax lien CSV headers;
- `generic_csv` fallback for all other uploads.

The adapter may add canonical internal fields such as `parcel_id`,
`lien_amount`, `estimated_value`, `property_type`, and `address` to stored
source rows when APN-style evidence and supporting headers are present. Dataset
API responses expose only safe import summary metadata: adapter id/name,
confidence, mapped fields, and warnings. They do not expose raw source rows.

Current limitation:

- no broad county adapter catalog;
- no live county sync;
- no scraping;
- no ML/AI import classification.

## Import Readiness Implementation

Phase 18 adds a backend-computed readiness layer for datasets. It runs after
CSV parsing and county adapter handling, then stores a safe readiness summary on
the dataset.

Current readiness output:

- status: `ready`, `partial`, `weak`, or `blocked`;
- 0-100 readiness score;
- scoring recommendation boolean;
- canonical field coverage for parcel identifier, lien amount, estimated value,
  property type, and address context;
- safe dataset-level issues;
- user-facing guidance.

Readiness treats lien amount and estimated value as required. Parcel identifier,
property type, and address context improve confidence but missing parcel
identifiers are warnings rather than hard blockers.

Current limitation:

- no full manual field-mapping editor;
- no spreadsheet transformation workflow;
- no global/shared import profile catalog;
- no broad county adapter coverage;
- no ML/AI import classification.

## Manual Mapping Repair Implementation

Phase 19 adds focused manual mapping for datasets that need import repair.

Current implementation:

- authenticated `GET /datasets/:datasetId/mapping`;
- authenticated `PATCH /datasets/:datasetId/mapping`;
- tenant ownership enforced through dataset lookup;
- supported targets limited to parcel id, lien amount, estimated value,
  property type, and address;
- source columns must already exist in dataset headers;
- one source column cannot map to multiple targets in one request;
- readiness is re-evaluated after mapping changes;
- scoring applies manual mappings as a derived overlay before normalization.

Manual mappings do not rewrite stored source rows. They are dataset-owned repair
metadata that makes weak or blocked imports usable when the user knows which
source columns correspond to critical fields.

Current limitation:

- no row-by-row editing;
- no spreadsheet transformation workflow;
- no ML/AI mapping suggestions;
- no reusable profile sharing across tenants;

## Import Profile Reuse Implementation

Phase 20 adds private reusable import profiles for repeated mapping workflows.

Current implementation:

- tenant-owned `ImportProfile` model;
- authenticated `GET /datasets/import-profiles`;
- authenticated `POST /datasets/:datasetId/import-profile`;
- authenticated `POST /datasets/:datasetId/import-profile/apply`;
- save-from-dataset requires an existing saved mapping that makes the dataset
  scoring-ready;
- profiles store supported target-to-source-column rules and normalized header
  applicability metadata;
- upload matching is deterministic and header-based;
- high-confidence signature matches can auto-apply a profile;
- changed-shape matches can be suggested for explicit user confirmation;
- source rows are not rewritten; profile mappings use the same overlay boundary
  as manual mappings.

Current limitation:

- no rule-builder UI;
- no profile marketplace or cross-user sharing;
- no ML/AI mapping suggestion;
- no broad ETL automation;
- no live county sync;
- no broad county adapter expansion.

## Enrichment Implementation

The enrichment foundation now exists as a backend-only source-row processing
layer between normalization and scoring.

Current implementation:

- enrichment adapter interface;
- enrichment service and explicit orchestration layer;
- `source_field_inference` adapter;
- `census_geocoder` external adapter, disabled unless configured;
- adapter outcomes for success, skipped, partial, and failed enrichment;
- enrichment freshness metadata with reprocess-after timing;
- controlled refresh/reprocessing requests that rerun scoring/enrichment
  through the existing worker job path;
- scheduled maintenance scanning that uses freshness metadata to find stale
  datasets and apply explicit refresh policy;
- enrichment result persisted on scored records;
- worker scoring path applies normalization, enrichment, then scoring;
- adapter failure handling records safe enrichment metadata and keeps scoring
  conservative.

Current adapter capabilities:

- infer missing parcel id, lien amount, estimated value, property type, and
  address from alternate uploaded headers;
- derive value from land plus improvement components when both are available;
- compute data-quality score for mapped fields.
- call the U.S. Census Geocoder for bounded, opt-in address normalization and
  location context when a normalized address is available.
- record disabled, no-match, timeout, and failed provider states as deliberate
  fallback metadata rather than hidden errors.

Current limitation:

- no provider sprawl or paid-service dependency;
- no external valuation provider;
- no ML/AI enrichment;
- no county-specific live integration.
- no unlimited autonomous refresh or broad sync automation.
- no user-facing scheduler policy editor.

## Watchlist Implementation

The watchlist foundation now exists. Watchlist items belong to one user and
reference scored records that have already passed dataset ownership checks.

Current watchlist API:

- `POST /watchlist`;
- `GET /watchlist`;
- `DELETE /watchlist/:watchlistItemId`.

Watchlist endpoints:

- require auth;
- verify ownership of the scored record being watched;
- prevent cross-user references;
- support add/remove/list;
- preserve user decision context.

Current limitation:

- no tags, collaboration, audit trails, task management, auction execution, or
  rich decision history.

## Portfolio Implementation

The portfolio foundation now exists. Portfolio items belong to one user and
reference either an owned scored record or an owned watchlist item.

Current portfolio API:

- `POST /portfolio`;
- `GET /portfolio`;
- `GET /portfolio/summary`;
- `GET /portfolio/:portfolioItemId`;
- `PATCH /portfolio/:portfolioItemId`;
- `DELETE /portfolio/:portfolioItemId`.

Portfolio endpoints:

- require auth;
- verify ownership of the scored record or watchlist item being tracked;
- prevent cross-user references;
- support add/list/detail/status/delete;
- support summary/status distribution/recent activity retrieval;
- preserve score context, flags, reasoning, and a status timestamp;
- do not imply financial performance guarantees.

The portfolio summary endpoint:

- aggregates only owned portfolio records;
- exposes status counts, active/ready/acquired totals, recent additions, recent
  status changes, and conservative needs-attention reasons;
- derives attention from current status, score flags, and confidence only;
- does not expose raw source rows, financial returns, accounting data, or
  predictive insight.

Current limitation:

- no notes, tags, alerts, collaboration, auction execution, accounting, or
  realized-return tracking;
- no financial analytics, return calculators, BI/report builders, or
  spreadsheet export suites.

## Comparison Implementation

The comparison foundation now exists. Comparison items belong to one user and
reference an owned scored record, owned watchlist item, or owned portfolio item.

Current comparison API:

- `POST /comparison`;
- `GET /comparison`;
- `PATCH /comparison/:comparisonItemId`;
- `GET /comparison/:comparisonItemId/history`;
- `POST /comparison/:comparisonItemId/handoff/watchlist`;
- `POST /comparison/:comparisonItemId/handoff/portfolio`;
- `DELETE /comparison/:comparisonItemId`.

Comparison endpoints:

- require auth;
- verify ownership of the scored/watchlist/portfolio source;
- prevent cross-user references;
- support add/list/update/delete;
- preserve score context, flags, reasoning, a small decision state, and a
  bounded note;
- record lightweight decision/note history from server-side updates;
- retrieve history only through an owned comparison item;
- create/reuse watchlist or portfolio records only through explicit user
  handoff actions;
- record safe handoff target linkage in decision history;
- let the separate allowlisted approval service invoke the existing portfolio
  handoff path after review;
- do not create alerts, auction, automation, or task side effects.

Current limitation:

- no legal-grade audit trail, task management, rich text notes, spreadsheet
  builders, general workflow engines, multi-step approval pipelines, auction
  execution, or ML/AI decision suggestions.

## Saved Views Implementation

The saved-view foundation now exists. Saved views belong to one user and store
validated reusable criteria for known review surfaces.

Current saved-view API:

- `POST /saved-views`;
- `GET /saved-views`;
- `GET /saved-views/:savedViewId/apply`;
- `PATCH /saved-views/:savedViewId`;
- `DELETE /saved-views/:savedViewId`.

Saved-view endpoints:

- require auth;
- scope all user-created views by authenticated `userId`;
- validate portfolio and comparison criteria against explicit allowlists;
- apply views over only the authenticated user's portfolio/comparison records;
- expose built-in attention queues grounded in current product data;
- reject arbitrary query fields and unsupported sorts.

Current queue signals:

- portfolio `needs_attention` from active `reviewing`/`tracked` items, score
  flags, and low confidence;
- portfolio `recently_changed` from status timestamp changes;
- comparison `needs_decision` from undecided comparison items;
- comparison `recent_decisions` from decision timestamp changes.

Current limitation:

- no shared/team views, report builders, arbitrary query languages,
  spreadsheet exports, collaboration workflows, ML/AI prioritization, or
  auction execution.

## Alerts Implementation

The alerts foundation now exists as in-app user-owned monitoring records.

Current alert API:

- `GET /alerts`;
- `PATCH /alerts/:alertId/read`;
- `PATCH /alerts/read-all`.

Alert endpoints:

- require auth;
- scope reads and updates by authenticated `userId`;
- expose safe event summaries only;
- support unread/read state;
- delegate supported email delivery decisions to the notification delivery
  service.

Current alert sources:

- completed `dataset_scoring` jobs;
- failed `dataset_scoring` jobs.

Current limitation:

- no SMS/push delivery;
- no realtime websocket feed;
- no scheduled alert generation;
- no admin monitoring dashboard.

## Notification Preferences Implementation

The notification preference foundation now exists. Preferences belong to one
user and control supported scoring and workspace-discussion alert types.

Current notification preference API:

- `GET /notification-preferences`;
- `PATCH /notification-preferences`.

Notification preference endpoints:

- require auth;
- scope lookup and upsert by authenticated `userId`;
- validate alert types, enabled flags, delivery modes, and cadence values;
- expose category metadata for the supported alert types only.

Supported scoring and discussion alerts receive explicit delivery
classification:

- disabled alert types are suppressed;
- `in_app_only` alerts remain in-app records;
- `delivery_eligible` + `immediate` alerts are prepared as
  `delivery_immediate`;
- `delivery_eligible` + `digest` alerts are prepared as `delivery_digest`.

Delivery-preparation payloads are provider-agnostic and bounded to safe alert
summaries and metadata. They do not contain raw dataset rows, stack traces,
provider credentials, or broad job internals.

The notification delivery foundation now records one email outbox entry per
user/source/channel. Immediate delivery-eligible alerts send through the SMTP
transport only when `EMAIL_DELIVERY_ENABLED`, `EMAIL_FROM_ADDRESS`, and
`SMTP_HOST` are configured. Missing config creates `provider_disabled` records
instead of failing startup.

Digest cadence creates `digest_ready` records. Phase 28 groups them by user and
processing window, atomically claims a bounded set, rechecks current
preferences, and sends one concise email through the same transport boundary.
The batch and included outbox records preserve sent, suppressed, failed, empty,
or provider-disabled outcomes. `GET /notification-deliveries` returns a safe
owner-scoped history projection.

Current limitation:

- no SMS/push provider delivery;
- no marketing messaging;
- no realtime push;
- no shared/team notification policies;
- no complex rules engines.

## Service Boundaries

Preferred backend boundaries:

- route layer handles HTTP shape;
- validation layer parses input;
- service layer handles business logic;
- model/data layer handles persistence;
- scoring package handles pure underwriting calculations;
- shared types define API contracts where appropriate.

Avoid large route handlers that combine validation, persistence, scoring, and
authorization in one place.

## Validation Philosophy

Validate every external input:

- request bodies;
- route params;
- query params;
- auth headers;
- CSV file fields;
- numeric ranges;
- enum values;
- object IDs.

Use schema validation where possible. `zod` is already present and should be
used consistently.

## Error Philosophy

Errors should be structured and safe:

```json
{
  "error": {
    "code": "example_error_code",
    "message": "Human-readable safe message."
  }
}
```

Do not expose:

- stack traces;
- raw database errors;
- secrets;
- file contents;
- another tenant's identifiers.

## Jobs And Workers Direction

Internal job and worker plumbing exists today. It is not external automation.

Current job implementation:

- tenant-owned internal job model;
- `dataset_scoring` job type;
- `dataset_maintenance` job type;
- `dataset` target entity type;
- request kind metadata for normal scoring, controlled refresh, maintenance
  scans, and policy refresh;
- queued/running/completed/failed lifecycle;
- duplicate-safe active job lookup for refresh requests;
- stale scored-record scanning and policy-gated maintenance jobs;
- explicit maintenance policy with manual-only default, per-run cap, minimum
  refresh interval, and failed-refresh suppression window;
- authenticated `GET /jobs/:jobId`;
- worker-side queued job claiming;
- dedicated worker entrypoint for dataset scoring execution;
- minimal scheduler module used for local job polling;
- safe summary and error metadata.

Future automation may need background processing for large files, enrichment, or
alerts. That should build on the job model rather than hiding work inside route
handlers.

Alerts are now the first user-facing visibility layer on top of job outcomes.
Future alert sources should call the alert service with safe metadata rather
than exposing raw job internals.

When introduced, background work must include:

- tenant ownership;
- idempotency;
- failure state;
- observability;
- rate/size limits;
- safe retry behavior.

## Implementation Order

Backend implementation order should stay disciplined:

1. auth and user model: implemented in Phase 2;
2. tenant-scoped dataset model and CSV upload: implemented in Phase 3;
3. parcel/lien normalization;
4. scoring package implementation and score APIs: implemented in Phase 4;
5. frontend scored-results table: implemented in Phase 5;
6. watchlist APIs and review surface: implemented in Phase 6;
7. portfolio APIs and status surface: implemented in Phase 7;
8. automation-ready internal job plumbing: implemented in Phase 8;
9. alerts and monitoring foundation: implemented in Phase 9;
10. background worker and scheduler groundwork: implemented in Phase 10;
11. enrichment adapter foundation: implemented in Phase 11;
12. controlled refresh/reprocessing workflow: implemented in Phase 14;
13. scheduled maintenance and policy-driven auto-refresh foundation:
    implemented in Phase 15;
14. county import adapter foundation: implemented in Phase 16;
15. browser upload workflow: implemented in Phase 17;
16. import validation and scoring-readiness workflow: implemented in Phase 18;
17. manual mapping/import repair workflow: implemented in Phase 19;
18. reusable import profile workflow: implemented in Phase 20;
19. comparison workspace and decision notes: implemented in Phase 21;
20. lightweight decision history: implemented in Phase 22;
21. explicit decision handoff: implemented in Phase 23;
22. portfolio dashboard and summary API: implemented in Phase 24;
23. saved views and attention queues: implemented in Phase 25;
24. notification preferences and delivery foundation: implemented in Phase 26;
25. email delivery and digest-ready outbox foundation: implemented in Phase 27;
26. scheduled digest processing and delivery history: implemented in Phase 28;
27. workspace and team-access foundation: implemented in Phase 29;
28. workspace activity and member-aware history: implemented in Phase 30;
29. workspace comments and discussion threads: implemented in Phase 31;
30. comment notification and discussion attention workflow: implemented in
    Phase 32;
31. workspace assignment and responsibility workflow: implemented in Phase 33;
32. dependency vulnerability and supply-chain hardening: implemented in Phase
    34;
33. role-aware workspace administration hardening: implemented in Phase 35;
34. focused approval requests and review checkpoints: implemented in Phase 36;
35. member-focused my-work dashboard and reviewer queues: implemented in Phase
    37;
36. follow subscriptions and stakeholder awareness: implemented in Phase 38;
37. review checklists and evidence gates: implemented in Phase 39;
38. workspace policy enforcement, decision briefs, final outcomes, outcome
    review, and bounded follow-up reminders: implemented through Phase 44;
39. later external automation.

Do not introduce automation before the manual workflow is correct.

## What Not To Overbuild Too Early

Avoid:

- generic distributed job systems before the current worker boundary needs them;
- custom permission matrices before the minimal workspace roles earn them;
- admin APIs before audit/security controls;
- treating best-effort workspace activity as immutable compliance evidence;
- turning contextual comments into chat, arbitrary HTML, or an unbounded
  notification stream beyond the one-alert-per-unread-cycle rule;
- turning responsibility assignments into task status, due dates, reminders,
  boards, general approvals, or automatic routing;
- expanding the focused approval checkpoint into chains, policy builders,
  escalation, or compliance workflow without a separate architecture phase;
- turning my-work aggregation into generic tasks, SLA scoring, workload
  analytics, recurrence scheduling, calendars, or AI prioritization;
- turning bounded follow-up reminders into task management, arbitrary
  recurrence, SLA escalation, workforce planning, or auction execution;
- turning follow subscriptions into social graphs, public feeds, arbitrary
  event rules, recommendations, or notification-on-every-change behavior;
- turning review checklists into forms, compliance evidence repositories,
  procedural manuals, hard workflow chains, or per-toggle alert streams;
- AI workflows before deterministic scoring;
- portfolio performance tracking, return calculators, or BI reporting before a
  separate financial analytics phase.
- arbitrary saved-view query builders, shared/team views, exports, or reporting
  dashboards before explicit access and product boundaries exist.

## Security Expectations

Every backend feature must include:

- auth decision;
- validation schema;
- workspace membership/role check if shared, or user ownership check if personal;
- tests for invalid input;
- tests for unauthorized access;
- docs;
- safe error behavior.

Workspace administration additionally requires target-role checks after
membership resolution. Owner records are immutable through current member
routes, admins can affect regular members only, role updates are owner-only,
and cross-workspace membership ids return non-disclosing not-found errors.

## Drift Risks

Backend drift risks:

- route handlers growing without service boundaries;
- client-supplied `userId`;
- unvalidated parcel/lien row ingestion;
- treating one county adapter as broad county coverage;
- treating readiness summaries as manual remapping or final data correctness;
- treating manual mappings as source-row mutation or arbitrary data editing;
- treating import profiles as global/shared or AI-generated mapping knowledge;
- trusting filenames or user labels as county proof;
- scoring logic duplicated outside the scoring package;
- inconsistent error shapes;
- permissive CORS into production;
- hidden assumptions that are not tested.

## Update Rules

Update this file when:

- backend architecture changes;
- new endpoint groups are added;
- service boundaries change;
- auth or tenant enforcement changes;
- job types or worker execution change.
