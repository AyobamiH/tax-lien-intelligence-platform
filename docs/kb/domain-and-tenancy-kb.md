# Domain And Tenancy KB

## What This File Governs

This file governs domain concepts and tenant isolation expectations. It explains
how future data should be modeled and protected.

It does not define every database schema. User, workspace, membership, activity, comment, dataset,
scored-record, internal job, alert, import profile, watchlist item, portfolio
item, and comparison item schemas now exist; a standalone parcel schema does
not.
When schemas are added, this file must be updated to reflect actual fields and
ownership rules.

## Current Domain Reality

Current implementation:

- user model exists for authentication;
- workspace and workspace-membership models exist;
- workspace-activity model exists;
- workspace-comment model exists;
- personal owner workspaces bootstrap on first workspace-aware access;
- dataset model exists for authenticated manual CSV uploads;
- dataset import summary metadata exists for generic fallback or the current
  Maricopa-style county import adapter;
- dataset readiness summary metadata exists for field coverage, issues, scoring
  recommendation, and safe guidance;
- dataset manual mapping metadata exists for tenant-owned import repair;
- import profile model exists for tenant-owned reusable mapping rules;
- scored-record model exists for first-pass scoring outputs;
- enrichment metadata exists on scored records for internal source-row
  inference;
- internal job model exists for user-owned execution metadata;
- alert model exists for user-owned workflow monitoring events;
- watchlist item model exists for user-owned scored-record shortlists;
- portfolio item model exists for user-owned tracked decisions/status;
- comparison item model exists for user-owned side-by-side review and
  lightweight decision notes;
- frontend review surface exposes workspace-shared datasets and scored records
  through authenticated, membership-checked API calls;
- frontend activity surface exposes bounded member-attributed workspace events;
- frontend detail surfaces expose workspace-scoped comments on four shared
  entity types;
- frontend watchlist surface exposes user-owned shortlisted scored records;
- frontend portfolio surface exposes user-owned tracked records and status;
- frontend comparison surface exposes user-owned comparison candidates,
  decision state, notes, flags, and reasoning;
- frontend alerts surface exposes user-owned scoring job outcome alerts;
- controlled refresh/reprocessing exists for owned datasets through
  tenant-owned internal jobs;
- scheduled maintenance jobs can inspect stale owned dataset scoring state and
  queue policy refresh only through server-side policy gates;
- no parcel model;

Current documentation direction:

- workspace-shared routes must verify membership and role before deriving the
  workspace owner's compatibility `userId`;
- personal records still enforce direct authenticated user ownership;
- authentication establishes identity and membership establishes shared access;
- dataset upload now uses auth and tenant ownership;
- first-pass scoring uses lightweight normalization plus internal enrichment and
  remains conservative.
- one deterministic county import adapter exists, but broad county coverage and
  live county sync do not.
- import readiness exists as read-only quality guidance, not manual field
  mapping or corrected data.
- focused manual mapping exists as target-to-source-column metadata, not row
  mutation or broad import tooling.
- reusable import profiles exist as private deterministic mapping reuse, not
  shared county knowledge or ML-based automation.

## Core Domain Concepts

### Workspace

A workspace is the selected tenant operating context. It has one owner and
active owner/admin/member memberships. Owners/admins can mutate shared core
data; members are read-only except for bounded collaboration actions such as
comments and approval requests. This is an access foundation, not task
management, custom approval policy, billing, or full collaboration.

### Workspace Activity

Workspace activity is workspace-owned operational context for a focused set of
meaningful shared actions. It stores the verified actor, an allowlisted event
type, a related entity, a server-derived summary, bounded metadata, and time.

Current status: implemented for dataset upload, score/refresh requests,
comparison decision/handoff, portfolio status, membership, responsibility, and
approval lifecycle changes. It does not store note text, raw errors, source
rows, personal alerts, or arbitrary client-authored events. It is not immutable
compliance audit infrastructure.

### Workspace Comment

A workspace comment is plain-text contextual discussion attached to a dataset,
comparison item, watchlist item, or portfolio item. The record stores the
workspace, verified actor identity/email snapshot, related entity, body, and
timestamps.

Current status: implemented with active-member list/create access, independent
target access checks, a 1,000-character limit, safe text rendering, and
author-only hard deletion. It is not chat, rich text, mentions, nested replies,
realtime presence, tasks, approvals, or an activity-feed event.

### Dataset

A dataset is a workspace-shared county parcel or tax lien CSV file. Current
dataset records store metadata, compatibility ownership, status, row/column
counts, headers, and a validation summary.

Current status: implemented as a manual CSV dataset foundation. Sanitized source
rows are stored internally for scoring, but public dataset responses expose only
metadata, validation summaries, safe import summaries, and safe readiness
summaries.

Phase 17 exposes dataset creation through the browser app while preserving the
same authenticated API and tenant-owned dataset model.

Phase 16 adds safe import summary metadata to datasets. The current adapter can
recognize Maricopa-style tax lien CSV headers and map selected source columns
into canonical internal fields before scoring. Non-matching uploads use the
generic CSV fallback. This is not broad county coverage or proof of county
identity.

Phase 18 adds import readiness summaries. They evaluate canonical field coverage
and scoring readiness at the dataset level. They help users understand whether
the upload is ready, partial, weak, or blocked before relying on scores. They do
not mutate rows, remap fields manually, or replace future county-adapter work.

Phase 19 adds focused manual mapping repair. A user can map known dataset
headers to critical canonical fields so readiness and scoring can use a derived
overlay. Stored source rows remain the source truth.

Phase 20 adds reusable import profiles. A user can save a scoring-ready mapping
repair as a tenant-owned profile, and later uploads can reuse that mapping only
when deterministic header matching is safe or when the user explicitly confirms
a suggestion. Profiles do not rewrite rows, prove county identity, or cross
tenant boundaries.

### Parcel

A parcel is an individual property record from a dataset. It may eventually
include parcel identifier, address/location, property type, value, lien amount,
access/usability fields, source row metadata, and normalized fields.

Current status: not implemented as a standalone model. Phase 4 normalizes
scoreable fields from stored source rows into scored records.

### Score

A score is an underwriting output generated from parcel/lien data. It should
include numeric values and explanations, not just a single opaque number.

Current status: implemented as a first-pass, rule-based scored-record model and
scoring package. It includes investment, risk, liquidity, redemption,
confidence, flags, and reasoning. Phase 5 now makes those results visible in
the browser for the signed-in user. It is not final institutional underwriting.

### Enrichment

Enrichment is a server-side processing layer between normalization and scoring.
It uses uploaded source-row fields to infer missing or weak normalized fields and
data-quality context. Phase 12 also adds one controlled external provider path
for U.S. Census Geocoder address normalization/location context.

Current status: implemented as `source_field_inference` for uploaded-row
aliases and component fields, plus optional `census_geocoder` output when the
provider is enabled. Phase 13 adds adapter outcomes, fallback state, freshness,
and reprocess-after metadata. Phase 14 adds controlled user-triggered refresh
that reruns enrichment/scoring for an owned dataset through the job boundary. It
does not include provider sprawl, paid integrations, ML/AI, broad scheduled
refresh, or county live integrations. Phase 15 adds bounded stale-state
maintenance scanning and policy-gated refresh creation, not unlimited
autonomous refresh.

### Watchlist

A watchlist is a user-owned shortlist of opportunities selected for further
review.

Current status: implemented as a tenant-owned watchlist item model and
add/list/remove API. It references scored records owned by the authenticated
user and stores enough score summary, flags, reasoning, and normalized field
context to support comparison without exposing another tenant's data.

### Portfolio

Portfolio means tracking chosen opportunities and investment decisions over
time without pretending to be accounting, brokerage, or auction software.

Current status: implemented as a tenant-owned portfolio item model and
add/list/detail/status/delete API. Portfolio items can be created from an owned
scored record or an owned watchlist item. They preserve score context, flags,
reasoning, and a simple status history timestamp.

### Comparison

Comparison means selecting scored, watchlist, or portfolio-linked records for
side-by-side review before a decision is finalized.

Current status: implemented as a tenant-owned comparison item model and
add/list/update/delete API. Comparison items can be created from an owned scored
record, owned watchlist item, or owned portfolio item. They preserve score
context, flags, reasoning, a small decision state, and a bounded plain-text
note. Phase 22 adds lightweight tenant-owned decision history for comparison
decision/note changes. Phase 23 adds explicit handoff actions from comparison
into watchlist or portfolio. Comparison records do not create collaboration
history, tasks, auction actions, or automated portfolio status changes by
themselves.

### Alert

An alert is a user-owned monitoring record that tells the user an important
workflow event happened or needs attention.

Current status: implemented for in-app scoring job completion and failure
events. Alerts include safe messages, severity, read/unread state, related
dataset/job metadata, and timestamps. Supported product alerts can create
tenant-owned email outbox records and send immediate email when preferences and
SMTP config allow it. Alerts do not deliver SMS/push and must not store raw job
payloads, stack traces, or uploaded source rows.

## Multi-Tenant Rule

Shared data requests must authenticate the user, verify active membership in
the selected workspace, enforce the role, and derive the workspace owner's
compatibility tenant key server-side. Personal requests continue to filter by
the authenticated user's `userId`.

Cross-workspace and cross-user access must be blocked at the service/query layer
and covered by tests.

## User-Owned Data

User-owned data includes or will include:

- profile/account records;
- uploaded datasets;
- parcel/lien records;
- score outputs;
- enrichment metadata;
- watchlist entries;
- portfolio records;
- comparison records;
- internal job records;
- refresh/reprocessing state;
- scheduled maintenance state;
- alerts;
- decision notes;
- decision history;
- decision handoff events;
- upload errors;
- audit events;
- automation job records.

These records must never be readable or writable across tenant boundaries.

## Trust Implications

Tax lien datasets may include valuable investment research, user strategy, and
decision history. Even if the source county data is public, a user's cleaned,
scored, filtered, and watchlisted view is private tenant data.

Tenant isolation protects:

- uploaded files;
- dataset metadata;
- dataset import summaries;
- dataset readiness summaries;
- dataset manual mappings;
- import profiles and profile application metadata;
- normalized records;
- scores;
- enrichment context;
- refresh status;
- maintenance policy status;
- reasoning;
- watchlists;
- decisions;
- in-app alerts;
- future automation outputs.

## Isolation Requirements

Future code must:

- derive user identity from trusted auth context;
- never trust a client-supplied `userId`;
- scope reads by authenticated user;
- scope writes by authenticated user;
- test cross-user access attempts;
- avoid aggregate endpoints that leak another tenant's counts or records;
- avoid logs that expose another tenant's data.

## Security Boundary

The tenancy boundary is one of the most important security boundaries in the
product. Phase 2 establishes authenticated user identity. Phase 3 uses that
identity for tenant-owned dataset records. Phase 4 uses it for scored records.
Phase 6 uses it for watchlist items. Phase 7 uses it for portfolio items. Phase
8 uses it for internal jobs. Phase 9 uses it for alerts. Phase 21 uses it for
comparison records and lightweight decision notes. Phase 22 uses it for
comparison decision history. Phase 23 uses it for comparison handoff actions
into watchlist and portfolio. Future standalone parcel models must build on the
same ownership pattern rather than inventing a parallel boundary.

Recommended pattern:

- use the existing auth middleware;
- create data models with required `userId`;
- centralize ownership checks;
- add integration tests for cross-user isolation;
- document each user-owned endpoint.

## Future Schema Direction

Future schemas should distinguish:

- user-controlled fields;
- server-derived fields;
- normalized fields;
- source-file metadata;
- scoring outputs;
- audit metadata.

For example, a score should be server-derived. A user should not be able to
submit their own `investmentScore` and have it treated as system truth.

## Drift Risks

Domain and tenancy drift risks:

- adding parcel records without `userId`;
- treating adapter matches, filenames, or source labels as authoritative county
  identity;
- accepting `userId` from request bodies;
- writing frontend filters that imply security;
- adding scoring outputs without dataset/source row linkage;
- storing watchlist items without verifying ownership of the underlying scored
  record;
- storing portfolio items without verifying ownership of the underlying scored
  record or watchlist item;
- storing comparison items without verifying ownership of the underlying scored
  record, watchlist item, or portfolio item;
- exposing alerts across tenants or filling alert metadata with raw internals;
- creating admin-like endpoints before user boundaries exist.

## Update Rules

Update this file when:

- a user-owned model is introduced;
- ownership rules change;
- cross-user isolation tests are added;
- domain concepts are renamed;
- automation records become real.
