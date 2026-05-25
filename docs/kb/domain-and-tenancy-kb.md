# Domain And Tenancy KB

## What This File Governs

This file governs domain concepts and tenant isolation expectations. It explains
how future data should be modeled and protected.

It does not define every database schema. User, dataset, scored-record,
watchlist item, and portfolio item schemas now exist; a standalone parcel schema
does not.
When schemas are added, this file must be updated to reflect actual fields and
ownership rules.

## Current Domain Reality

Current implementation:

- user model exists for authentication;
- dataset model exists for authenticated manual CSV uploads;
- scored-record model exists for first-pass scoring outputs;
- watchlist item model exists for user-owned scored-record shortlists;
- portfolio item model exists for user-owned tracked decisions/status;
- frontend review surface exposes user-owned datasets and scored records through
  authenticated API calls;
- frontend watchlist surface exposes user-owned shortlisted scored records;
- frontend portfolio surface exposes user-owned tracked records and status;
- no parcel model;

Current documentation direction:

- every future user-facing document must include `userId`;
- every query must enforce user ownership;
- authentication exists and provides the user identity boundary;
- dataset upload now uses auth and tenant ownership;
- first-pass scoring uses lightweight normalization and remains conservative.

## Core Domain Concepts

### Dataset

A dataset is a user-uploaded county parcel or tax lien CSV file. Current dataset
records store metadata, ownership, status, row/column counts, headers, and a
validation summary.

Current status: implemented as a manual CSV dataset foundation. Sanitized source
rows are stored internally for scoring, but public dataset responses expose only
metadata and validation summaries.

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

## Multi-Tenant Rule

Every future user-owned data model must include:

`userId`

Every query serving user data must filter by the authenticated user's `userId`.

Cross-user access must be blocked at the service/query layer and covered by
tests.

## User-Owned Data

User-owned data includes or will include:

- profile/account records;
- uploaded datasets;
- parcel/lien records;
- score outputs;
- watchlist entries;
- portfolio records;
- decision notes;
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
- normalized records;
- scores;
- reasoning;
- watchlists;
- decisions;
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
Phase 6 uses it for watchlist items. Phase 7 uses it for portfolio items. Future
standalone parcel models must build on the same ownership pattern rather than
inventing a parallel boundary.

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
- accepting `userId` from request bodies;
- writing frontend filters that imply security;
- adding scoring outputs without dataset/source row linkage;
- storing watchlist items without verifying ownership of the underlying scored
  record;
- storing portfolio items without verifying ownership of the underlying scored
  record or watchlist item;
- creating admin-like endpoints before user boundaries exist.

## Update Rules

Update this file when:

- a user-owned model is introduced;
- ownership rules change;
- cross-user isolation tests are added;
- domain concepts are renamed;
- automation records become real.
