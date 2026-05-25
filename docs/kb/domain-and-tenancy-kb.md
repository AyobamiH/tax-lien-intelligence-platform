# Domain And Tenancy KB

## What This File Governs

This file governs domain concepts and tenant isolation expectations. It explains
how future data should be modeled and protected.

It does not define exact database schemas yet because those are not implemented.
When schemas are added, this file must be updated to reflect actual fields and
ownership rules.

## Current Domain Reality

Current implementation:

- user model exists for authentication;
- no dataset model;
- no parcel model;
- no score model;
- no watchlist model;
- no portfolio model.

Current documentation direction:

- every future user-facing document must include `userId`;
- every query must enforce user ownership;
- authentication exists and provides the user identity boundary;
- CSV ingestion starts after auth and tenant ownership exist.

## Core Domain Concepts

### Dataset

A dataset is a user-uploaded county parcel or tax lien file. In future phases it
should represent a bounded upload event with metadata, validation status, row
counts, and ownership.

Current status: not implemented.

### Parcel

A parcel is an individual property record from a dataset. It may eventually
include parcel identifier, address/location, property type, value, lien amount,
access/usability fields, source row metadata, and normalized fields.

Current status: not implemented.

### Score

A score is an underwriting output generated from parcel/lien data. It should
include numeric values and explanations, not just a single opaque number.

Current status: scoring package placeholder only.

### Watchlist

A watchlist is a user-owned shortlist of opportunities selected for further
review.

Current status: not implemented.

### Portfolio

Portfolio direction means tracking chosen opportunities and investment decisions
over time. It is future direction after core upload/scoring/watchlist workflows.

Current status: not implemented.

## Multi-Tenant Rule

Every future user-owned data model must include:

`userId`

Every query serving user data must filter by the authenticated user's `userId`.

Cross-user access must be blocked at the service/query layer and covered by
tests.

## User-Owned Data

Future user-owned data likely includes:

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
product. Phase 2 establishes authenticated user identity. Future dataset, parcel,
score, watchlist, and portfolio models must build on that identity rather than
inventing a parallel ownership pattern.

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
- adding scoring outputs without source record linkage;
- storing watchlist items without verifying ownership of the underlying parcel;
- creating admin-like endpoints before user boundaries exist.

## Update Rules

Update this file when:

- a user-owned model is introduced;
- ownership rules change;
- cross-user isolation tests are added;
- domain concepts are renamed;
- portfolio or automation records become real.
