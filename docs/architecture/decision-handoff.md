# Decision Handoff Architecture

Phase 29 requires owner/admin workspace access for handoff and keeps the source
and destination inside the same selected workspace compatibility tenant key.

Phase 23 adds explicit action transitions from the comparison workspace into the
existing watchlist and portfolio surfaces.

This layer answers:

> I have compared this candidate. Where did I deliberately send it next, and
> what decision/note context moved with it?

It does not answer:

> What automated workflow should run, who approved the action, what task board
> should update, or what auction execution should happen?

Those are future concerns and require separate architecture decisions.

## Current Scope

Implemented scope:

- authenticated comparison-to-watchlist handoff action;
- authenticated comparison-to-portfolio handoff action;
- duplicate-safe destination creation/reuse;
- server-side ownership checks through the source comparison item;
- handoff history events with target entity id/result metadata;
- bounded note snapshot preservation through decision history;
- focused frontend controls in the comparison detail panel;
- result visibility and navigation to the destination surface;
- tests for successful handoff, duplicate behavior, cross-user rejection,
  invalid/stale references, and frontend API calls.

Not implemented:

- broad workflow engines;
- collaboration or approval handoffs;
- task/project management;
- auction execution;
- automation rules;
- ML/AI recommendations.

## Backend Flow

The comparison service owns handoff orchestration because comparison is the
source of the decision.

For `POST /comparison/:comparisonItemId/handoff/watchlist`:

1. validate the comparison item id;
2. load the comparison item for the authenticated user;
3. create or reuse the user's watchlist item for the same scored record;
4. record a `comparison_handoff_to_watchlist` history event;
5. return the destination item, duplicate result, and history event.

For `POST /comparison/:comparisonItemId/handoff/portfolio`:

1. validate the comparison item id and optional portfolio status;
2. load the comparison item for the authenticated user;
3. create or reuse the user's portfolio item for the same scored record;
4. preserve source watchlist linkage when the comparison item came from a
   watchlist item;
5. record a `comparison_handoff_to_portfolio` history event;
6. return the destination item, duplicate result, and history event.

The backend never trusts client-submitted ownership, dataset ids, score
snapshots, target ids, or history metadata.

## History And Linkage

Handoff continuity is stored as decision history metadata, not as a separate
workflow graph.

Handoff history records include:

- source comparison item id;
- current decision state;
- current bounded note snapshot when present;
- target entity type;
- target entity id;
- whether the destination was created or already existed;
- portfolio status when relevant.

This is enough to answer where a candidate went without introducing a lineage
engine, approval model, or task system.

## Frontend Surface

The comparison detail panel exposes two explicit actions:

- send to watchlist;
- track in portfolio.

After a successful handoff, the panel shows whether the destination received the
record or already had it, the target id, and a navigation action to the
destination surface.

The UI is intentionally small. It should remain an action bridge, not a wizard
or workflow board.

## Security Boundaries

Security requirements:

- every handoff route requires authentication;
- every handoff starts from an owned comparison item;
- destination records are created/reused for the same authenticated user only;
- stale or deleted comparison ids fail with `comparison_item_not_found`;
- history events are server-created only;
- history metadata must remain safe and derived;
- handoff cannot create cross-user watchlist or portfolio records.

Decision handoff is private tenant workflow data because it reveals investment
intent and operational follow-through.

## Drift Risks

Future contributors should avoid:

- making handoff implicit when a decision state changes;
- letting `move_forward` automatically create portfolio records;
- accepting client-submitted target ids or ownership;
- turning handoff into a broad workflow engine;
- adding approval/collaboration semantics without authorization design;
- using handoff events as legal-grade audit logs;
- creating auction execution side effects.

## Update Rules

Update this document when:

- handoff routes change;
- new destination surfaces become valid;
- destination duplicate behavior changes;
- history metadata changes;
- handoff starts producing alerts, tasks, approval events, or automation side
  effects.
