# Portfolio Tracking Architecture

Phase 7 introduces the first post-shortlist operating layer. A portfolio item
represents a scored record that the authenticated user is actively tracking as a
decision or position candidate.

The portfolio is deliberately not a brokerage, accounting ledger, auction tool,
or return model. It preserves the score context, flags, and reasoning that made
the record worth tracking, then adds a small explicit status workflow.

## Current Implementation

Implemented in Phase 7:

- tenant-owned portfolio item model in `packages/db`;
- portfolio service/store boundaries in `apps/api/src/portfolio`;
- authenticated `POST /portfolio`, `GET /portfolio`,
  `GET /portfolio/:portfolioItemId`, `PATCH /portfolio/:portfolioItemId`, and
  `DELETE /portfolio/:portfolioItemId` routes;
- ability to track either an owned scored record or an owned watchlist item;
- idempotent duplicate handling by user and scored record;
- status update support;
- frontend portfolio route using `#/portfolio`;
- track/untrack actions from the scored-record review table;
- promotion from watchlist to portfolio tracking;
- dedicated portfolio table and detail surface;
- cross-user and invalid-reference tests.

Not implemented:

- notes;
- tags;
- alerts;
- collaboration;
- live auction execution;
- accounting or realized-return tracking;
- external sync;
- ML/AI assistance.

## Data Model

The portfolio item stores:

- `userId`;
- source dataset id;
- source scored record id;
- optional source watchlist item id;
- status;
- status update timestamp;
- source row number;
- normalized field snapshot;
- score snapshot;
- score timestamp;
- tracked timestamp;
- created/updated timestamps.

The denormalized snapshot keeps the portfolio useful even if a dataset is
rescored later. The source record references preserve traceability to the
review workflow.

## Status Model

Supported statuses are:

- `tracked`;
- `reviewing`;
- `ready`;
- `acquired`;
- `closed`;
- `discarded`.

The statuses are intentionally plain and operational. They should not be treated
as legal, accounting, or auction states.

## Backend Boundary

The frontend can create a portfolio item by sending either:

- `scoredRecordId`; or
- `watchlistItemId`.

The backend derives `userId` from the verified JWT and validates ownership of
the referenced scored record or watchlist item before creating a portfolio item.
The frontend never submits score values, user ownership, or trusted status
metadata.

Status updates are limited to the portfolio status enum and are scoped by
`userId` in the store layer.

## Frontend Boundary

The frontend integrates portfolio tracking into the existing review flow:

- scored-result rows show whether the record is already tracked;
- score detail can track or untrack the selected record;
- watchlist rows can be promoted to portfolio tracking;
- portfolio route shows tracked records by status and score context;
- portfolio detail exposes status editing, score context, flags, and reasoning.

This is a dense operator workflow, not a decorative dashboard.

## Relationship To Watchlist

The watchlist remains the shortlist layer. It answers:

> Which records should I keep for comparison?

The portfolio answers:

> Which records am I actively tracking as decisions or positions?

Portfolio items may originate from watchlist items, but a scored record can also
be tracked directly from the scored-results table.

## Security Considerations

Portfolio data is private tenant data because it reveals investment intent and
decision state.

The implementation requires:

- authentication on every portfolio route;
- service-side ownership validation;
- no trusted client `userId`;
- cross-user source-reference rejection;
- cross-user portfolio item read/update/delete rejection;
- safe not-found errors for inaccessible records.

Future expansion such as notes, tags, alerts, or collaboration must preserve
these ownership checks and add tests for any new write path.

## Drift Controls

Do not:

- turn portfolio into accounting or brokerage workflow without a new phase;
- add fake P&L or return metrics before real domain support exists;
- create portfolio items from arbitrary client-submitted score data;
- rely on frontend filtering as authorization;
- add automation or external alert delivery through portfolio status without
  job, alert, and audit design.

## Update Rules

Update this document when:

- portfolio fields change;
- status values change;
- notes, tags, or alerts become real;
- portfolio endpoints or response contracts change;
- portfolio interactions with watchlist/scoring change.
