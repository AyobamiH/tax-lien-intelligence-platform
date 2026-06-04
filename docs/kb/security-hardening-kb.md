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
- `JWT_SECRET` modeled in configuration;
- production startup fails when `JWT_SECRET` is missing;
- Helmet middleware enabled in the API;
- JSON request body limit set to `1mb`;
- CORS middleware configured;
- structured JSON 404 responses;
- global API error handling;
- password hashing for registration;
- JWT issuance and verification;
- auth middleware for protected routes;
- safe auth responses that do not return password hashes;
- tests for common auth failure modes;
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

### Current Missing Protections

Not yet implemented:

- tenant-owned parcel models;
- authorization checks for future resource types;
- cross-user isolation tests for future parcel resources;
- rate limiting;
- standalone normalized parcel/lien upload validation;
- richer manual field-mapping validation and audit trail;
- audit logging;
- production CORS restrictions;
- final browser session architecture beyond the current session-scoped JWT;
- deployed worker authorization and credential isolation model;
- rate limits for repeated refresh requests;
- external alert delivery security;
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
- external alert delivery;
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

Not implemented yet.

Future rate limiting should cover:

- registration;
- login;
- upload;
- expensive scoring requests;
- future automation triggers.

### CORS And Headers

Current:

- Helmet is enabled.
- CORS allows reflected origins with credentials.

Future:

- production CORS should restrict known frontend origins;
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

Every user-owned model must include `userId`.

Every query must scope to authenticated `userId`.

Every user-owned endpoint must test cross-user access attempts.

### API Authorization

Authorization must be server-side. The frontend can hide controls for usability,
but security must live in backend checks.

### Auditability

Future audit records should exist for sensitive events:

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

Must be scoped by `userId`:

- datasets;
- parcels;
- scores;
- watchlist items;
- portfolio records;
- internal jobs;
- alerts;
- upload logs;
- automation jobs;
- user decisions.

Must never cross tenant boundaries:

- uploaded data;
- normalized records;
- scores;
- reasoning;
- watchlists;
- decision notes;
- in-app alerts.

Future queries must:

- derive user from auth context;
- include ownership filter;
- reject cross-user references;
- avoid client-supplied ownership.

Tests must include:

- user A cannot read user B records;
- user A cannot update user B records;
- user A cannot watchlist user B parcel;
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
events, or task records. Future expansion such as multiple workspaces,
collaboration, richer history, broad activity feeds, approvals, or downstream
automation side effects must add validation, authorization, docs, and cross-user
tests before release.

### Automation Jobs And Workers

Internal jobs now include tenant ownership, lifecycle status, safe
summary/error metadata, request-kind metadata, worker-side claiming, and
worker-driven dataset scoring. Controlled refresh requests reuse active
queued/running dataset jobs instead of creating duplicate work. The current
worker is a trusted local backend process, not a deployed external worker fleet.
Future external jobs must add idempotency, rate limits, worker authorization,
credential isolation, and safe logs.

### Alerts And Notifications

Current alerts are in-app records only. They are tenant-owned, authenticated,
and limited to safe scoring job summaries.

Alerts must not reveal tenant data through raw metadata, email previews, logs,
or incorrect recipient routing. Future delivery channels require recipient
validation, template review, provider secret handling, and opt-out/settings
controls before launch.

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
