# Security Hardening KB

## What This File Governs

This file governs security posture, trust boundaries, hardening requirements, and
security drift controls for the Tax Lien Intelligence Platform.

It must be updated as implementation matures. It must not describe future
security controls as current protections.

## 1. Purpose

Security is first-class in this SaaS because the product will handle:

- user accounts;
- uploaded datasets;
- investment research;
- scored opportunities;
- watchlists;
- decision history;
- portfolio records.

Tax lien data may originate from public county sources, but a user's cleaned,
scored, filtered, and watchlisted data is private business context. Multi-tenant
isolation raises the bar because one user's data must never be exposed to another
user.

The product must earn trust through secure boundaries and explainable output.

## 2. Current Security Posture

### Current Implemented Protections

Current repo protections:

- strict TypeScript configuration;
- environment parsing with `zod`;
- `.env` and `.env.*` ignored except `.env.example`;
- high-severity `npm audit` enforcement in CI and the local pre-push hook;
- frontend compiler, CSS, and bundler packages classified as development-only;
- Vite upgraded from vulnerable `7.3.3` to `8.0.16` and both esbuild paths
  consolidated on fixed `0.28.1`;
- `multer` lockfile resolution refreshed to `2.2.0` after new upload DoS
  advisories affected `2.1.1`;
- full and production-only npm audits at Phase 34 completion report zero known
  vulnerabilities;
- `JWT_SECRET` modeled in configuration;
- production startup fails when `JWT_SECRET` is missing;
- Helmet middleware enabled in the API;
- JSON request body limit set to `1mb`;
- CORS middleware configured with dev/test reflected-origin ergonomics and a
  production allowlist controlled by `CORS_ALLOWED_ORIGINS`;
- fixed-window scoring and refresh request limits for expensive dataset scoring
  routes, configured by `SCORING_REQUEST_LIMIT_WINDOW_MS` and
  `SCORING_REQUEST_LIMIT_MAX`;
- structured JSON 404 responses;
- global API error handling;
- password hashing for registration;
- JWT issuance and verification;
- auth middleware for protected routes;
- safe auth responses that do not return password hashes;
- tests for common auth failure modes;
- explicit workspace and membership persistence;
- selected-workspace membership and minimal owner/admin/member role checks;
- owner-only non-owner role updates with no admin/member self-escalation path;
- owner protection, admin-to-member-only removal, retained inactive membership
  records, immediate inactive-member access rejection, and safe reactivation;
- membership ids are resolved inside the selected workspace and unknown or
  cross-workspace ids share a non-disclosing not-found response;
- role-aware frontend administration states backed by server authorization;
- workspace-owned activity persistence with server-derived summaries;
- cross-workspace activity rejection and actor-attribution tests;
- workspace-owned comments with allowlisted target types and verified target
  access through the selected workspace;
- plain-text comment trimming, empty/content/1,000-character validation, safe
  React text rendering, and no raw HTML interpretation;
- comment queries scoped by workspace id, author-only hard deletion, and tests
  for cross-workspace, stale-target, invalid-id, unsafe-content, and role
  behavior;
- discussion-attention records scoped by authenticated user, verified
  workspace, entity type, and entity id;
- peer-only comment alerts with self-notification exclusion and one alert per
  unread cycle;
- discussion alert/delivery metadata allowlists that exclude comment body text;
- tests for unread accumulation/read clearing, cross-workspace read rejection,
  preference-aware digest classification, and safe discussion payloads;
- workspace-owned assignments with a unique target boundary, allowlisted target
  types, verified target access, and active same-workspace assignees;
- server-derived assignment actor/workspace identity, explicit no-op behavior,
  owner/admin mutation checks, cross-workspace rejection, stale-target
  filtering, and new-assignee-only notifications;
- assignment alert/delivery metadata allowlists with no record content, notes,
  compatibility tenant key, or arbitrary task payload;
- my-work aggregation derived from authenticated actor and verified workspace,
  with reviewer eligibility, stale-target filtering, bounded previews, and no
  comment body content;
- workspace-scoped follow-ups for comparison, watchlist, and portfolio records
  with selected-workspace membership, target-access revalidation, safe date/note
  validation, stale-target omission, and assignee/creator recipient resolution
  derived server-side;
- follow-up reminder alerts use allowlisted metadata only and do not include
  follow-up note text, record contents, calendar payloads, or arbitrary task
  fields;
- workspace policy persistence scoped by selected workspace, owner/admin-only
  mutation, active-member reads, exact allowlisted rule validation, default-off
  compatibility, and cross-workspace rejection;
- policy evidence derived from existing assignment and checklist access
  boundaries, with approval satisfaction supplied only by the approved
  execution path and readiness rechecked before execution;
- decision brief aggregation behind authentication and selected-workspace
  membership, with comparison target access checked before returning dataset,
  assignment, checklist, approval, policy, history, or discussion evidence;
- decision briefs are read-only and omit stale source datasets rather than
  weakening target access or fabricating evidence;
- decision outcome state behind authentication, selected-workspace membership,
  comparison target access, owner/admin mutation, safe bounded resolution-note
  validation, and no rationale copying into activity metadata;
- approved final outcomes check current governance prerequisites and reject
  while approvals are still pending;
- outcome review aggregation behind authentication and selected-workspace
  membership, with current comparison target filtering before counts or recent
  resolution rows are returned so stale/deleted and cross-workspace outcomes do
  not leak;
- tenant-owned dataset records;
- authenticated dataset upload/list/detail routes;
- browser upload flow that uses the authenticated dataset upload endpoint;
- 1 MiB CSV upload limit;
- CSV parser row, column, and record-size guardrails;
- deterministic county import adapter boundary with one Maricopa-style adapter
  and generic fallback;
- import summary responses expose safe metadata only;
- import readiness responses expose safe coverage, issue, score,
  recommendation, and guidance metadata only;
- manual mapping responses expose safe target-to-source-column metadata only;
- import profile responses expose tenant-owned mapping rules and safe
  applicability metadata only;
- cross-user dataset detail rejection tests;
- tenant-owned scored-record persistence;
- authenticated scoring run and score retrieval routes;
- scoring ownership enforcement;
- cross-user scoring rejection tests;
- frontend review surface for signed-in users;
- tenant-owned watchlist item persistence;
- authenticated watchlist add/list/remove routes;
- watchlist ownership enforcement against scored records;
- duplicate-safe watchlist adds;
- cross-user watchlist rejection tests;
- tenant-owned portfolio item persistence;
- authenticated portfolio add/list/summary/detail/status/delete routes;
- portfolio ownership enforcement against scored records and watchlist items;
- portfolio summary aggregation over owned records only;
- duplicate-safe portfolio adds;
- cross-user portfolio rejection tests;
- tenant-owned comparison item persistence;
- authenticated comparison add/list/update/delete routes;
- comparison ownership enforcement against scored records, watchlist items, and
  portfolio items;
- duplicate-safe comparison adds;
- bounded note validation;
- server-created lightweight decision history;
- owner-scoped comparison history retrieval;
- explicit owner-scoped decision handoff routes;
- server-derived handoff target metadata;
- cross-user comparison/history/handoff rejection tests;
- tenant-owned saved view persistence;
- authenticated saved-view create/list/apply/update/delete routes;
- saved-view criteria allowlists for known portfolio/comparison fields;
- saved-view apply behavior over owned portfolio/comparison records only;
- cross-user saved-view apply rejection tests;
- tenant-owned internal job persistence;
- authenticated job detail route;
- job ownership enforcement;
- tenant-owned notification preference persistence;
- authenticated notification preference get/update routes;
- notification preference validation for known alert types and delivery modes;
- preference-driven alert suppression and provider-agnostic delivery
  preparation without raw payload dumping;
- tenant-owned notification delivery outbox persistence;
- env-driven SMTP email config that remains disabled when required config is
  missing;
- owner-derived email recipient resolution for supported product alerts;
- duplicate-send avoidance for email delivery source keys;
- notification preference tests for defaults, invalid payloads, and delivery
  classification;
- notification delivery tests for suppression, disabled config, provider
  failure, duplicate avoidance, owner-safe recipients, and email content;
- worker-side queued job claiming for supported job types;
- worker-driven dataset scoring execution;
- request-kind metadata for scoring vs refresh jobs;
- duplicate-safe refresh job reuse for queued/running dataset jobs;
- minimal scheduler module for local job polling;
- scheduled maintenance scans with manual-only default policy;
- policy-created refresh jobs distinguishable from manual refresh jobs;
- duplicate and recent-failure suppression around policy refresh creation;
- internal source-row enrichment before scoring;
- persisted safe enrichment metadata on scored records;
- safe job summary and error metadata;
- cross-user job rejection tests;
- tenant-owned alert records;
- authenticated alert list/read/read-all routes;
- alert ownership enforcement;
- safe alert metadata;
- cross-user alert acknowledgement tests;
- frontend auth errors clear the browser review session;
- conservative scoring behavior for missing or weak data;
- root quality gates for typecheck, test, and build;
- CI quality-gates workflow;
- local pre-push hook;
- direct-to-main workflow that requires local gates before push.

### Phase 34 Dependency Triage Record

The two high entries reported by npm were a direct Vite finding and its
transitive esbuild cause. The affected esbuild versions were build-time
`0.27.7` and `0.28.0`; they were not loaded by the deployed API or browser
runtime. The high advisory could affect developer/CI execution through a
malicious registry configuration, so the development-only classification was
not treated as a reason to defer remediation.

The repo now uses Vite `8.0.16` and esbuild `0.28.1`. No override was needed,
and no npm vulnerability remains. Future high or critical findings must block
CI unless they are explicitly contained and documented with exact package
paths, exposure, and follow-up.

### Current Missing Protections

Not yet implemented:

- tenant-owned parcel models;
- authorization checks for future resource types;
- cross-user isolation tests for future parcel resources;
- broad per-user/API rate limiting beyond the scoring and refresh route guard;
- standalone normalized parcel/lien upload validation;
- richer manual field-mapping validation and audit trail;
- audit logging;
- ownership transfer and recovery workflow beyond the protected single-owner
  model;
- SSO/SAML, SCIM, custom roles, and enterprise policy administration;
- multi-environment production CORS rollout guidance;
- final browser session architecture beyond the current session-scoped JWT;
- deployed worker authorization and credential isolation model;
- distributed or persisted rate limits for repeated refresh requests;
- SMS/push alert delivery security;
- digest retry/rate-limit policy beyond the current bounded one-attempt batch;
- secret rotation guidance.

### Intentionally Deferred

Deferred because the corresponding systems do not exist yet:

- upload malware/content controls;
- per-user rate limits;
- external worker fleet/job security;
- external queue execution hardening;
- external enrichment provider security;
- admin security;
- richer scoring audit trail;
- SMS/push alert delivery;
- advanced digest templates and user-configurable scheduling;
- automation monitoring.

### Where The Baseline Is Acceptable

The baseline is acceptable for Phase 1 because it establishes:

- package boundaries;
- strict typing;
- basic API hardening middleware;
- configuration validation;
- tests and CI.

It is not sufficient for a public authenticated SaaS until rate limiting,
production CORS decisions, browser session hardening, and later resource
authorization boundaries are completed.

## 3. Security Principles

The product should follow these principles:

- least privilege;
- tenant isolation;
- secure by default;
- validate all external input;
- explicit trust boundaries;
- no silent trust of client data;
- no overexposed internals;
- explainability without leaking sensitive internals;
- safe errors over raw errors;
- tests for every permission boundary.

## 4. Hardening Requirements By Area

### Auth And Identity

Current:

- register endpoint;
- login endpoint;
- user model;
- protected route middleware;
- `GET /auth/me`;
- duplicate email handling;
- invalid and expired token tests.

Required later:

- password reset if product needs it;
- email verification if required for public launch;
- account/profile management when scoped.

### Password Handling

Passwords must:

- be hashed using a strong password hashing library;
- never be logged;
- never be returned in API responses;
- never be stored in plaintext.

Password hashing is implemented with `bcryptjs`.

### JWT And Session Handling

JWT handling must:

- require a strong production secret;
- include expiration;
- reject malformed tokens;
- reject expired tokens;
- derive user identity server-side;
- avoid trusting client-supplied `userId`.

The current development default for `JWT_SECRET` must not be treated as
production-safe. Production startup now requires an explicit `JWT_SECRET`.

### Secret Management

Current:

- `.env` files are ignored.
- `.env.example` uses placeholder values.

Required:

- production must use real secret management;
- no secrets in frontend bundles;
- no secrets in logs;
- no secrets committed to docs or tests.

### Env Handling

Current:

- API env is parsed with `zod`.

Future hardening:

- production should fail without strong secrets;
- environment-specific requirements should be explicit;
- test config should not mask production requirements.

### Request Validation

Current auth endpoints validate request payloads with `zod`.

Every future endpoint must validate:

- body;
- params;
- query;
- headers where relevant;
- file upload metadata.

Use schema validation consistently.

### Error Handling

Errors must:

- use stable codes;
- provide safe messages;
- avoid raw stack traces;
- avoid raw database errors;
- avoid leaking another tenant's data.

Global error handling is implemented for API errors, validation failures,
malformed JSON, upload middleware failures, and unexpected server errors.

### Logging

Future logs must not include:

- passwords;
- tokens;
- JWTs;
- uploaded raw files;
- sensitive investment notes;
- another tenant's data.

Logging should support debugging without becoming a data exposure path.

### Rate Limiting

Current:

- expensive scoring and refresh requests have an in-process fixed-window
  limiter after authentication and workspace write checks;
- limits are scoped by authenticated user, selected workspace, HTTP method, and
  route shape;
- exceeded limits return `429 rate_limit_exceeded` with a bounded retry hint;
- authenticated workspace-scoped score/refresh limit blocks write bounded
  workspace activity events without storing source row values or request
  payloads;
- defaults are controlled by `SCORING_REQUEST_LIMIT_WINDOW_MS` and
  `SCORING_REQUEST_LIMIT_MAX`.

Future rate limiting should cover:

- registration;
- login;
- upload;
- future automation triggers.

Production hardening still needs distributed or persisted rate limiting before
multi-instance deployment.

### CORS And Headers

Current:

- Helmet is enabled.
- development and test CORS allow reflected origins with credentials for local
  browser workflows.
- production CORS denies browser origins unless `CORS_ALLOWED_ORIGINS` contains
  exact allowed origins.
- requests without a browser `Origin` header remain allowed so health checks and
  server-to-server callers are not blocked by the browser CORS layer.

Future:

- production deployments must set the explicit frontend origin allowlist;
- headers should be verified in deployment;
- credentials should not be enabled for arbitrary origins.

### Body Limits And Upload Constraints

Current:

- JSON body limit is `1mb`.
- CSV uploads are limited to 1 MiB.
- CSV parsing has row, column, and record-size limits.

Future row/file persistence needs:

- memory-safe parsing;
- clear rejection errors.

### File Upload Security

Current dataset upload handles:

- empty CSV;
- malformed rows;
- safe failure without partial unsafe writes.
- browser upload through the same authenticated API boundary.
- read-only readiness summaries for field coverage and scoring suitability.
- backend-validated manual mapping metadata for critical-field repair.

Future parcel/lien normalization must handle:

- missing required domain fields;
- extreme numeric values;
- duplicate parcels;
- unexpected columns;
- dangerous formula-like cell values if exported later.

### Dependency Hygiene

Current:

- npm lockfile exists;
- CI installs from lockfile.

Future:

- run audit checks periodically;
- do not auto-fix without review;
- review new dependencies for purpose and maintenance risk.

### Tenancy Enforcement

Phase 29 introduces explicit workspaces and memberships. Shared product routes
must authenticate the user, verify active membership in the selected workspace,
check the required role, and only then derive the workspace owner's existing
`userId` compatibility tenant key.

Personal records must still scope directly to the authenticated `userId`.
Workspace-shared endpoints must test cross-workspace access and role-restricted
mutations; personal endpoints must continue testing cross-user access.

Workspace activity is queried by the verified selected workspace id, never a
client-supplied tenant key passed directly into the store. Actor identity comes
from the authenticated principal and server-side user lookup. Only the email
already visible in the member list is exposed; notes, raw failures, source
rows, and personal notification state are excluded.

### API Authorization

Authorization must be server-side. The frontend can hide controls for usability,
but security must live in backend checks.

### Operational History And Future Auditability

Current Phase 30 workspace activity records a bounded set of meaningful shared
events:

- dataset uploads;
- score/refresh requests;
- bounded score/refresh rate-limit blocks;
- comparison decision changes and successful handoffs;
- portfolio status changes;
- membership and role changes.

These records are best-effort operational history. They are not immutable,
transactional, retention-guaranteed, or compliance-grade.

Future audit records may still be needed for sensitive events such as:

- login failures if needed;
- uploads;
- scoring runs;
- watchlist changes;
- portfolio decisions;
- future admin actions.

Audit logs must be tenant-safe and avoid leaking sensitive content.

### CI And Local Quality Gates

Current:

- CI runs install, typecheck, test, build.
- local pre-push hook runs install, typecheck, test, build.
- direct pushes to `main` are accepted only after local gates pass.

Future security-sensitive changes should add targeted tests, not rely only on
build success.

## 5. Multi-Tenant Security Model

Workspace-shared through verified membership:

- datasets;
- scores;
- watchlist items;
- portfolio records;
- internal jobs;
- user decisions.
- bounded workspace activity.

Personal user-scoped data:

- alerts;
- notification preferences;
- delivery and digest history;
- saved views.

Must never cross tenant boundaries:

- uploaded data;
- normalized records;
- scores;
- reasoning;
- watchlists;
- decision notes;
- workspace activity and actor attribution;
- in-app alerts.

Future queries must:

- derive user from auth context;
- verify selected-workspace membership when data is shared;
- enforce owner/admin write and member read-only rules;
- derive the compatibility tenant key server-side;
- include direct user ownership filters for personal data;
- reject cross-user references;
- avoid client-supplied ownership.

Tests must include:

- user A cannot read user B records;
- user A cannot update user B records;
- user A cannot watchlist user B parcel;
- a non-member cannot select another workspace;
- a member cannot mutate workspace-shared data;
- an admin cannot assign administrators or change roles;
- a non-member cannot read another workspace's activity;
- activity filters cannot bypass the verified workspace scope;
- user A cannot track or update user B portfolio records;
- user A cannot compare, update, or delete user B comparison records;
- user A cannot read user B job records;
- user A cannot read or acknowledge user B alert records;
- user A cannot infer user B records through counts or errors.

## 6. Future-Sensitive Systems

### Dataset Uploads

Uploads are high-risk because they accept external input. Phase 3 now has size
limits, safe parsing, ownership, and error handling for manual CSV dataset
metadata. Phase 16 adds one deterministic county import adapter boundary that
runs after parsing and before persistence. It must use explicit header evidence,
return safe summary metadata, and avoid trusting filenames or user-provided
source labels as proof of county identity. Phase 17 exposes the same upload
boundary in the browser app; the frontend must not weaken file limits, bypass
auth, send `userId`, or turn import summaries into raw source previews.
Phase 18 adds import readiness summaries. Those summaries are safe browser
metadata for field coverage, issue severity, score, recommendation, and
guidance. They must not expose raw source rows, parser internals, or stack
traces, and they must not become client-side authorization or scoring logic.
Phase 19 adds focused manual mapping repair. The API must validate target fields
and source columns, scope mappings to dataset ownership, and apply mappings as a
derived overlay rather than rewriting stored source rows.
Phase 20 adds reusable import profiles. The API must keep profiles tenant-owned,
validate mappings before saving, avoid false-positive auto-application, and
make profile reuse visible as none/suggested/auto-applied/user-applied state.

Future row normalization and raw file persistence, if added, need additional
controls.

### County Import Adapters

Current county import support is intentionally narrow:

- `maricopa_tax_lien_v1` can map Maricopa-style APN/tax/value/use/address
  headers into canonical internal fields;
- `generic_csv` remains the fallback for non-matching uploads.

Security requirements for all import adapters:

- deterministic detection based on explicit headers;
- no live provider calls during upload;
- no scraping;
- no ML/AI classification before deterministic rules are reliable;
- no raw source rows or parser internals in browser responses;
- no trusting client-supplied county labels as authority;
- tests for false-positive non-match behavior;
- tenant ownership unchanged by adapter selection.

### Scoring Explanations

Explanations should be useful without exposing internal secrets or another
tenant's data.

The current frontend displays server-derived flags and reasoning for the
signed-in user's scored records. It must not add client-derived score claims or
display another tenant's data through cache/state reuse.

### Enrichment

Current enrichment uses uploaded source-row data and, when explicitly enabled,
one U.S. Census Geocoder adapter. It runs inside the trusted worker scoring
path. It may infer missing fields, data-quality context, and safe external
address/location metadata, but it is not final verification or underwriting
truth.

Phase 13 adds explicit orchestration and fallback metadata. Disabled providers,
provider no-match, timeout, and failure states are represented as safe outcomes
on the scored record instead of raw provider errors.

Phase 14 adds a controlled refresh path. Refresh is authenticated,
tenant-scoped, job-backed, and duplicate-safe while a dataset job is queued or
running. It is not an automatic loop or broad sync mechanism.

Phase 15 adds scheduled maintenance groundwork. Maintenance scans are bounded,
worker-side, and policy-gated. The default policy is manual-only. When
auto-refresh is explicitly enabled, maintenance jobs may create
`policy_refresh` jobs after ownership, stale-record, duplicate, recent refresh,
and recent failure gates pass. This is not unlimited autonomous refresh.

Enrichment output must stay safe:

- no raw full source rows in browser responses;
- no raw adapter exceptions;
- no third-party provider payloads;
- no unbounded external requests;
- no unbounded reprocessing loops;
- no duplicate refresh storms from repeated user actions;
- no hidden policy refresh jobs that look like manual user requests;
- no secrets;
- no cross-user enrichment leakage.

The current external adapter is opt-in, uses HTTPS configuration, has timeout
and per-job row limits, records freshness/reprocess metadata, and requires no
provider secret. Future external providers will require provider-secret
handling, tenant-safe logs, retry policy, rate limits, and clear
source/confidence/outcome labels before launch.

### Watchlists

Watchlists now verify ownership of referenced scored records before a user can
keep them. Watchlist responses expose score summaries, flags, and reasoning for
the signed-in user only.

Future watchlist expansion such as notes, tags, or decision statuses must add
validation and cross-user tests before release.

### Portfolio Records

Portfolio records may be more sensitive than raw parcel data because they reveal
investment intent and decisions.

Portfolio records now verify ownership of the referenced scored record or
watchlist item before tracking. Portfolio reads, summaries, status updates, and
deletes are scoped to the authenticated user. Portfolio summaries aggregate
owned records only and expose bounded status/activity/attention metadata rather
than raw source rows, financial analytics, or cross-tenant activity. Future
portfolio expansion such as notes, alerts, reporting, exports, or collaboration
must add validation and cross-user tests before release.

### Comparison Records

Comparison records are private tenant decision data because they reveal which
opportunities a user is actively evaluating and why.

Comparison records now verify ownership of the referenced scored record,
watchlist item, or portfolio item before adding to comparison. Comparison list,
decision/note updates, deletes, history reads, and handoff actions are scoped to
the authenticated user. Notes are plain text, bounded, and validated. Decision
history is created server-side only and stores bounded note snapshots plus safe
derived metadata. Handoff target metadata is also server-derived and cannot be
client supplied. These records are not rich text, comments, legal-grade audit
events, or task records. Phase 36 adds one allowlisted approval checkpoint for
comparison-to-portfolio handoff. Broader approval actions, richer history,
compliance policy, or downstream automation side effects require a separate
validation and authorization phase.

### Approval Requests

Approval requests are decision-authority records and must remain
workspace-scoped.

Current implemented protection:

- active selected-workspace membership before every operation;
- workspace-id-qualified request lookup and cross-workspace non-disclosure;
- owner/admin review authority with requester self-review denied;
- requester-only cancellation;
- server-derived actors, roles, status, outcome, and permission booleans;
- target validation on creation and revalidation immediately before approval;
- short-lived atomic reviewer claims, claim-qualified pending resolution, and
  one-pending-request uniqueness;
- bounded plain-text notes with control-character rejection;
- note exclusion from activity summaries and metadata;
- reuse of the existing duplicate-safe portfolio handoff path.

Known boundary:

- owners retain an explicit direct handoff compatibility path for solo
  workspaces, but it is blocked when a request is pending for the target;
- approval activity is operational context, not a compliance-grade audit log;
- Phase 36 does not send approval alerts or email.

Later hardening must be designed before adding multi-step chains, delegations,
quorums, enterprise policy, escalation, e-signatures, or automated routing.

### My Work Aggregation

My-work responses combine several sensitive sources and therefore reapply the
strongest relevant boundary instead of trusting identifiers already stored in
queue records.

Current protection:

- authenticated actor and selected-workspace membership are required;
- assignment retrieval remains actor-specific and target-revalidated;
- approvals must be pending, reviewable by the actor, and still accessible;
- discussion attention must match actor and workspace, remain unread, and
  still point to an accessible record;
- stale and cross-workspace targets are omitted or rejected without disclosure;
- previews and source reads are bounded;
- comment bodies are not returned.

The endpoint does not infer urgency, manager visibility, workload, or access
from client state. Any future queue source must define its own personal
relevance and tenancy checks before joining this aggregation.

### Follow Subscriptions

Follow state changes personal visibility and notification scope, so it must not
be treated as a client-side bookmark.

Current protection:

- authenticated actor and active selected-workspace membership for every route;
- allowlisted target types and ObjectId validation;
- current target-access checks for state retrieval and creation;
- workspace-, actor-, type-, and target-qualified unique subscriptions;
- stale/inaccessible target omission from personal lists and My Work;
- idempotent stale-subscription cleanup without target disclosure;
- active-membership filtering for follower counts and notification fan-out;
- no follower identity list in the current API;
- actor exclusion and direct-assignee deduplication for bounded alerts;
- personal notification-preference enforcement before in-app/email delivery;
- workspace remounting of frontend record state.

Following never grants record access, reviewer authority, assignment, or a
workspace role. Social graphs, public feeds, recommendation logic, presence,
and arbitrary event subscriptions remain out of scope.

### Review Checklists

Checklist state is a trust signal assembled from shared operational records,
so the backend revalidates both workspace membership and target access.

Current protection:

- authenticated active selected-workspace membership for every route;
- allowlisted target types and ObjectId validation;
- owner/admin-only template mutation with member-readable templates;
- current target-access checks before state or completion updates;
- workspace/type/target-qualified record instances;
- stable server-generated item ids with unknown and duplicate-id rejection;
- server-derived completing actor and timestamp;
- stale and cross-workspace targets rejected without disclosure;
- no toggle alerts, activity spam, attachments, or executable content.

Checklist completion does not grant approval, handoff, assignment, or record
access. The Phase 39 readiness signal is not a compliance-grade audit record
and does not hard-block actions.

### Automation Jobs And Workers

Internal jobs now include tenant ownership, lifecycle status, safe
summary/error metadata, request-kind metadata, worker-side claiming, and
worker-driven dataset scoring. Controlled refresh requests reuse active
queued/running dataset jobs instead of creating duplicate work. The current
worker is a trusted local backend process, not a deployed external worker fleet.
Future external jobs must add idempotency, rate limits, worker authorization,
credential isolation, and safe logs.

### Alerts And Notifications

Current alerts are tenant-owned, authenticated, and limited to safe scoring job
summaries. Phase 27 adds email delivery/outbox handling for supported product
alerts only. Phase 28 adds tenant-owned digest batches, bounded scheduled
processing, send-time preference checks, duplicate-window protection, and
owner-safe delivery history.

Alerts must not reveal tenant data through raw metadata, email previews, logs,
or incorrect recipient routing. Current email delivery resolves recipients from
the alert owner's user record, uses bounded product-alert content, stores safe
outbox state, keeps SMTP config in env, and exposes neither recipient addresses
nor raw provider details in delivery history. Digest processing atomically
claims one user/window batch, bounds records per batch and users per run,
rechecks current preferences, and makes one provider attempt without hidden
retries. Future SMS/push channels, advanced templates, configurable schedules,
and retry policies require separate recipient validation, provider secret
handling, rate limits, and opt-out/settings controls before launch.

### Admin/Internal Tooling

Admin tools should not be built until authorization, audit logging, and least
privilege patterns are designed.

## 7. Security Coding Expectations

Every future feature must include:

- implementation;
- input validation;
- authorization decision;
- tenant ownership checks if user-owned;
- tests for invalid inputs;
- tests for unauthorized access;
- docs;
- changelog entry.

No feature is complete without security consideration.

## 8. Security Testing Expectations

Required future test categories:

- auth success/failure;
- malformed payloads;
- missing fields;
- invalid JWT;
- expired JWT;
- protected route without token;
- cross-user access attempts;
- upload edge cases;
- permission boundaries;
- no raw secrets in responses;
- safe error responses.

## 9. Security Drift Risks

Security drift risks:

- accepting client-supplied `userId`;
- adding models without ownership;
- building upload before validation;
- adding client-only upload validation that disagrees with backend limits;
- keeping permissive CORS into production;
- logging uploaded data or tokens;
- allowing frontend-only access control;
- adding external automation before external job and worker security exists;
- adding external enrichment providers before provider security exists;
- adding county adapters without deterministic detection and false-positive
  tests;
- treating a filename, label, or one adapter match as broad county verification;
- treating readiness as manual remapping, final underwriting confidence, or a
  reason to bypass server-side scoring/ownership checks;
- treating manual mappings as raw data mutation or allowing arbitrary column
  transforms without a separate security phase;
- sharing import profiles across tenants or treating profile suggestions as
  hidden ML-generated source truth;
- turning alerts into raw diagnostic payloads;
- treating public source data as non-sensitive after user enrichment;
- skipping cross-user tests.

## 10. Update Rules

Update this file when:

- auth is implemented;
- user-owned models are added;
- upload endpoints are added;
- county import adapters are added or changed;
- CORS/header behavior changes;
- rate limiting is added;
- logging/audit patterns are introduced;
- background jobs are introduced;
- worker execution or scheduler behavior changes;
- security posture changes materially.

When updating, keep these labels clear:

- `Current implemented protection`;
- `Required next protection`;
- `Later hardening layer`;
- `Known risk`.
