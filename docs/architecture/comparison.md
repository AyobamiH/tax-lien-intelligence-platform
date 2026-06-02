# Comparison Workspace Architecture

Phase 21 introduces the comparison workspace and lightweight decision notes.
This is the first explicit side-by-side decision surface after watchlist and
portfolio tracking.

The comparison workspace answers:

> Which candidates should I compare directly, what is my current decision, and
> what short note explains that decision?

It does not answer:

> Who approved this decision, what tasks remain, what auction action should run,
> or what does an AI model recommend?

Those are future concerns and require separate architecture decisions.

## Current Scope

Implemented scope:

- tenant-owned comparison item model in `packages/db`;
- comparison service/store boundaries in `apps/api/src/comparison`;
- authenticated `POST /comparison`, `GET /comparison`,
  `PATCH /comparison/:comparisonItemId`, and
  `DELETE /comparison/:comparisonItemId` routes;
- ability to compare an owned scored record, watchlist item, or portfolio item;
- duplicate-safe comparison adds keyed by user/workspace/scored record;
- bounded plain-text decision notes;
- explicit decision states;
- frontend `#/comparison` workspace;
- compare actions from scored review, watchlist, and portfolio surfaces;
- side-by-side comparison matrix;
- selected-item note/reasoning/flag detail panel;
- integration and frontend model/API tests.

Not implemented:

- saved multiple workspaces;
- collaboration or team comments;
- audit trails;
- rich text notes;
- task/project management;
- spreadsheet builders;
- auction execution;
- ML/AI recommendations.

## Domain Model

The current implementation uses one implicit default workspace per user. This is
intentional. It gives the product a durable comparison layer without adding
workspace management before there is evidence users need it.

The comparison item stores:

- `userId`;
- `workspaceId`, currently always `default`;
- source dataset id;
- source scored record id;
- source type: `score`, `watchlist`, or `portfolio`;
- optional source watchlist item id;
- optional source portfolio item id;
- decision state;
- decision update timestamp;
- optional note and note update timestamp;
- source row number;
- normalized source fields;
- denormalized score snapshot;
- scored timestamp;
- added/created/updated timestamps.

The score snapshot keeps the comparison useful even if the source dataset is
rescored later. The source scored record id remains stable where possible so the
comparison can still relate back to the active scored-record layer.

## Source Resolution

The frontend can add to comparison by sending exactly one of:

- `scoredRecordId`;
- `watchlistItemId`;
- `portfolioItemId`.

The backend verifies ownership of the referenced source before creating the
comparison item. The browser cannot submit ownership, dataset id, normalized
fields, score values, or derived source references.

This follows the same tenant-boundary pattern as watchlist and portfolio.

## Decision States And Notes

Decision states:

- `undecided`;
- `keep_reviewing`;
- `move_forward`;
- `rejected`.

These states are lightweight review markers. They do not trigger side effects.
`move_forward` does not automatically create a portfolio item, schedule a task,
send an alert, or execute an auction action.

Notes are intentionally plain text. They are trimmed, capped at 500 characters,
and validated for unsupported control characters. This avoids introducing rich
text sanitization, collaboration semantics, or audit-history complexity before
the product needs it.

## Frontend Surface

The frontend integrates comparison into the existing review loop:

- scored-record rows and detail panels can add/remove comparison items;
- watchlist rows and detail panels can add/remove comparison items;
- portfolio rows and detail panels can add/remove comparison items;
- `#/comparison` shows a side-by-side matrix;
- selected item detail exposes decision state, lightweight note editing,
  reasoning, and flags.

The comparison page is dense and operational. It should remain a decision tool,
not a decorative card gallery or spreadsheet replacement.

## Relationship To Watchlist And Portfolio

The watchlist answers:

> Which records are worth keeping?

The portfolio answers:

> Which records am I actively tracking as decisions or positions?

The comparison workspace answers:

> Which records do I need to evaluate side by side right now?

These layers overlap by source record but have different jobs. Do not collapse
them into one generic saved item model unless a future architecture decision
proves that the distinction is harmful.

## Security Boundaries

Security requirements:

- authentication on every comparison route;
- ownership checks before source resolution;
- no cross-user comparison list/update/delete access;
- no trusting client-submitted score snapshots;
- bounded note input;
- safe error responses;
- no raw internal processing details in notes or comparison metadata.

Comparison data is private tenant data because it reveals investment intent and
decision reasoning.

## Drift Risks

Future contributors should avoid:

- turning comparison notes into team comments without collaboration boundaries;
- using `move_forward` as an implicit auction or portfolio action;
- accepting client-submitted score/context fields;
- adding broad note history before audit requirements are designed;
- making comparison a spreadsheet builder;
- merging comparison, watchlist, and portfolio semantics casually.

## Update Rules

Update this document when:

- comparison item fields change;
- multiple workspaces become real;
- decision states change;
- notes gain history, formatting, or collaboration behavior;
- comparison begins creating downstream portfolio, alert, or auction side
  effects;
- comparison API response contracts change.
