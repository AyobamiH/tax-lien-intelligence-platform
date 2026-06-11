# Decision History Architecture

Phase 29 exposes decision history to active members of the selected workspace.
History writes still occur only through owner/admin comparison mutations.

Phase 22 adds a lightweight, tenant-owned decision history layer for the
comparison workspace.

This layer answers:

> What changed in this comparison item, when did it change, and what bounded
> note context explains the change?

It does not answer:

> Is this a legal-grade audit trail, who approved a regulated action, what exact
> rich-text diff changed, or what automated decision should run next?

Those are future concerns and require separate product, security, and
compliance decisions.

## Current Scope

Implemented scope:

- tenant-owned decision history model in `packages/db`;
- decision history store in `apps/api/src/decision-history`;
- comparison service event capture when decision or note state actually
  changes;
- authenticated `GET /comparison/:comparisonItemId/history` route;
- owner-scoped history retrieval through the owning comparison item;
- bounded note snapshots for decision context;
- safe metadata: workspace id, dataset id, scored record id, and source type;
- selected-item history visibility in the frontend comparison detail panel;
- API, integration, and review-model tests.

Not implemented:

- full compliance/legal audit logging;
- immutable append-only infrastructure guarantees;
- approval workflows;
- task/project management;
- rich diffs;
- auction execution;
- ML/AI decision assistance.

## Domain Model

Decision history records currently store:

- `userId`;
- `relatedEntityType`, currently `comparison_item`;
- `relatedEntityId`;
- `eventType`, currently `comparison_decision_changed` or
  `comparison_note_changed`, plus handoff events for watchlist/portfolio;
- optional previous/new decision values;
- optional previous/current note snapshots capped by the comparison note limit;
- optional safe source metadata;
- optional safe handoff target metadata;
- created/updated timestamps.

The history record is intentionally tied to the user and the comparison item.
The browser cannot create history directly, submit ownership, or submit source
metadata.

## Event Creation

History events are created by `ComparisonService` after:

1. the authenticated user is known;
2. the comparison item id is validated;
3. the comparison item is found for that user;
4. the update payload is validated and normalized;
5. the owner-scoped comparison update succeeds;
6. the service compares prior state to updated state.

No event is created for a no-op update. A decision update that also includes a
note change is recorded as a decision-change event with note context.

Phase 23 adds handoff events:

- `comparison_handoff_to_watchlist`;
- `comparison_handoff_to_portfolio`.

These events include target entity id/result metadata and the current bounded
note snapshot when present. They do not create a general workflow graph.

## Retrieval

The current retrieval API is:

- `GET /comparison/:comparisonItemId/history`

The service first verifies that the comparison item belongs to the authenticated
user. If the item is missing, deleted, or belongs to another user, the route
returns `comparison_item_not_found`.

This keeps history retrieval aligned with the same tenant boundary as the
comparison workspace.

Phase 30 adds a separate membership-protected workspace activity endpoint for
broader shared awareness. It summarizes decision changes and handoffs without
copying note snapshots. Item-level decision history remains the detailed source
for one comparison record.

## Frontend Surface

The frontend shows history only in the selected comparison item detail panel.
It is a compact timeline underneath the decision note, reasoning, and flags.

The UI shows:

- event label;
- timestamp;
- previous/new decision when available;
- bounded note snapshot or note-cleared context.

It does not show raw dataset rows, raw internal processing metadata, or
compliance-style audit language.

## Security Boundaries

Security requirements:

- every history retrieval requires authentication;
- history is scoped by `userId`;
- retrieval requires an owned comparison item;
- history creation happens server-side only;
- note snapshots remain bounded plain text;
- metadata is safe and derived server-side;
- no raw dataset rows, stack traces, secrets, or internal processing payloads
  are stored in history events.

Decision history is private tenant decision data because it reveals investment
intent and changing diligence context.

## Drift Risks

Future contributors should avoid:

- treating this as legal-grade audit infrastructure;
- exposing history through an unscoped or cross-workspace activity feed;
- accepting client-created history events;
- adding rich text or diffs without sanitization and storage rules;
- mixing collaboration comments into the history model;
- storing raw CSV rows, provider payloads, stack traces, or secrets in history
  metadata;
- turning decision history into auction execution or task-management state.

## Update Rules

Update this document when:

- history event types change;
- additional related entity types are added;
- history is exposed outside the comparison detail panel;
- event retention, immutability, or compliance guarantees change;
- history metadata fields change;
- handoff event metadata fields change;
- collaboration, approval, or audit semantics are introduced.
