# Comparison Workspace Architecture

Phase 29 distinguishes the tenant workspace from the existing default
comparison collection. Comparison data is shared inside the selected tenant
workspace; members can read and owners/admins can mutate.

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
  `PATCH /comparison/:comparisonItemId`,
  `GET /comparison/:comparisonItemId/history`,
  `POST /comparison/:comparisonItemId/handoff/watchlist`,
  `POST /comparison/:comparisonItemId/handoff/portfolio`, and
  `DELETE /comparison/:comparisonItemId` routes;
- ability to compare an owned scored record, watchlist item, or portfolio item;
- duplicate-safe comparison adds keyed by user/workspace/scored record;
- bounded plain-text decision notes;
- explicit decision states;
- frontend `#/comparison` workspace;
- compare actions from scored review, watchlist, and portfolio surfaces;
- side-by-side comparison matrix;
- selected-item note/reasoning/flag detail panel;
- selected-item lightweight decision history visibility;
- explicit handoff actions into watchlist and portfolio;
- integration and frontend model/API tests.

Not implemented:

- saved multiple workspaces;
- collaboration or team comments;
- legal-grade audit trails;
- workflow engines or approval pipelines;
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
send an alert, or execute an auction action. Phase 23 adds explicit handoff
buttons so the user can deliberately send a comparison item to watchlist or
portfolio.

Notes are intentionally plain text. They are trimmed, capped at 500 characters,
and validated for unsupported control characters. Phase 22 records lightweight
decision/note change history using bounded note snapshots, but the notes are not
rich text, collaboration comments, legal approvals, or task records.

## Frontend Surface

The frontend integrates comparison into the existing review loop:

- scored-record rows and detail panels can add/remove comparison items;
- watchlist rows and detail panels can add/remove comparison items;
- portfolio rows and detail panels can add/remove comparison items;
- `#/comparison` shows a side-by-side matrix;
- selected item detail exposes decision state, lightweight note editing,
  reasoning, flags, and lightweight decision history.
- selected item detail exposes explicit watchlist/portfolio handoff actions and
  result visibility.

The comparison page is dense and operational. It should remain a decision tool,
not a decorative card gallery or spreadsheet replacement.

## Relationship To Watchlist And Portfolio

The watchlist answers:

> Which records are worth keeping?

The portfolio answers:

> Which records am I actively tracking as decisions or positions?

The comparison workspace answers:

> Which records do I need to evaluate side by side right now?

Decision handoff answers:

> Where did I deliberately send this comparison candidate next?

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
- server-derived history events for decision/note changes and explicit
  handoffs only.
- server-derived handoff history events with safe target linkage only.

Comparison data is private tenant data because it reveals investment intent and
decision reasoning.

## Drift Risks

Future contributors should avoid:

- turning comparison notes into team comments without collaboration boundaries;
- using `move_forward` as an implicit auction or portfolio action;
- making handoff implicit when a decision state changes;
- accepting client-submitted score/context fields;
- treating lightweight history as legal-grade audit logging;
- exposing broad history feeds before authorization and product requirements are
  designed;
- making comparison a spreadsheet builder;
- merging comparison, watchlist, and portfolio semantics casually.

## Update Rules

Update this document when:

- comparison item fields change;
- multiple workspaces become real;
- decision states change;
- notes gain history, formatting, or collaboration behavior;
- decision history event fields change;
- handoff destinations or metadata change;
- comparison begins creating downstream portfolio, alert, or auction side
  effects;
- comparison API response contracts change.
