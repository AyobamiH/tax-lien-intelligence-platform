# Outcome Review Architecture

Phase 43 adds a bounded retrospective layer over the Phase 42 final outcome
model. The goal is to help a workspace learn from resolved comparison work
without turning the product into a BI platform.

## Source Data

Outcome review uses existing product truth only:

- current workspace-scoped decision outcome records;
- current comparison items accessible through the selected workspace
  compatibility tenant key;
- resolver attribution and timestamps already stored on final outcomes.

The service does not create new analytics facts, predictive scores, or financial
performance records.

## Aggregation

`OutcomeReviewService` builds:

- total current comparison items;
- resolved versus unresolved comparison counts;
- counts by final outcome status;
- counts by supported entity type;
- recent final outcomes inside a bounded `windowDays` window;
- recent declined/deferred counts;
- practical retrospective signals such as unresolved work, deferred outcomes,
  no recent resolutions, or no recorded outcomes.

Only `comparison_item` outcomes are supported today because Phase 42 only
implements final outcomes for comparison items.

## Access Control

The route is read-only and requires:

- authenticated user;
- selected-workspace membership;
- workspace read permission.

Aggregation is workspace-scoped. Before counts or rows are returned, outcome
targets are filtered through the current comparison list for
`context.tenantUserId`. This omits stale/deleted comparison targets and avoids
surfacing entity details the viewer could not otherwise access.

## Frontend Surface

The web app adds `#/outcome-review` as a compact operational retrospective
surface. It shows:

- summary counts;
- outcome mix by status;
- recent resolutions for the selected time window;
- grounded review signals;
- navigation into the existing comparison-item decision brief for inspection.

The UI stays intentionally plain and dense. It does not add chart galleries,
fake insight cards, or AI recommendations.

## Boundaries

Phase 43 does not include:

- arbitrary report builders;
- export-heavy BI workflows;
- revenue, ROI, or P&L modeling;
- predictive analytics;
- ML/AI insight generation;
- legal/compliance reporting;
- auction execution.

This is a retrospective learning surface over current operational records, not
an analytics suite.
