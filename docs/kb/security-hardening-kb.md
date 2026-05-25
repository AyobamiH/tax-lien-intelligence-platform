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
- future portfolio records.

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
- root quality gates for typecheck, test, and build;
- CI quality-gates workflow;
- local pre-push hook on the accepted workflow branch.

### Current Missing Protections

Not yet implemented:

- tenant-owned models;
- authorization checks;
- cross-user isolation tests;
- rate limiting;
- upload security;
- file type/size validation;
- CSV validation;
- global error handler beyond 404 behavior;
- audit logging;
- production CORS restrictions;
- secret rotation guidance.

### Intentionally Deferred

Deferred because the corresponding systems do not exist yet:

- upload malware/content controls;
- per-user rate limits;
- job security;
- admin security;
- scoring audit trail;
- portfolio data protections;
- automation monitoring.

### Where The Baseline Is Acceptable

The baseline is acceptable for Phase 1 because it establishes:

- package boundaries;
- strict typing;
- basic API hardening middleware;
- configuration validation;
- tests and CI.

It is not sufficient for a public authenticated SaaS.

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

Current structured 404 is a good start, but global error handling is not yet
implemented.

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

Future upload endpoints need:

- file size limits;
- file type checks;
- row count limits if needed;
- memory-safe parsing;
- clear rejection errors.

### File Upload Security

CSV upload must handle:

- empty CSV;
- malformed rows;
- missing required fields;
- extreme values;
- duplicate parcels;
- unexpected columns;
- dangerous formula-like cell values if exported later;
- safe failure without partial unsafe writes.

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

Future security-sensitive changes should add targeted tests, not rely only on
build success.

## 5. Multi-Tenant Security Model

Must be scoped by `userId`:

- datasets;
- parcels;
- scores;
- watchlist items;
- future portfolio records;
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
- future alerts.

Future queries must:

- derive user from auth context;
- include ownership filter;
- reject cross-user references;
- avoid client-supplied ownership.

Tests must include:

- user A cannot read user B records;
- user A cannot update user B records;
- user A cannot watchlist user B parcel;
- user A cannot infer user B records through counts or errors.

## 6. Future-Sensitive Systems

### Dataset Uploads

Uploads are high-risk because they accept external input. They need validation,
limits, safe parsing, and careful error handling.

### Scoring Explanations

Explanations should be useful without exposing internal secrets or another
tenant's data.

### Watchlists

Watchlists must verify ownership of referenced parcels.

### Portfolio Records

Portfolio records may be more sensitive than raw parcel data because they reveal
investment intent and decisions.

### Automation Jobs

Future jobs must include tenant ownership, idempotency, rate limits, and safe
logs.

### Alerts And Notifications

Alerts must not reveal tenant data through email previews, logs, or incorrect
recipient routing.

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
- keeping permissive CORS into production;
- logging uploaded data or tokens;
- allowing frontend-only access control;
- adding automation before job security exists;
- treating public source data as non-sensitive after user enrichment;
- skipping cross-user tests.

## 10. Update Rules

Update this file when:

- auth is implemented;
- user-owned models are added;
- upload endpoints are added;
- CORS/header behavior changes;
- rate limiting is added;
- logging/audit patterns are introduced;
- background jobs are introduced;
- security posture changes materially.

When updating, keep these labels clear:

- `Current implemented protection`;
- `Required next protection`;
- `Later hardening layer`;
- `Known risk`.
