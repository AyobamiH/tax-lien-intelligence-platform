# Saved Views And Attention Queues Architecture

Phase 25 adds reusable operational work slices. A saved view is a tenant-owned
filter configuration for a known review surface, currently portfolio or
comparison. It helps users return to the same practical queue without rebuilding
filter state each time.

This is not a BI system, report builder, spreadsheet export feature, shared
workspace, or arbitrary query language.

## Current Implementation

Implemented in Phase 25:

- tenant-owned saved view model in `packages/db`;
- saved-view store/service boundaries in `apps/api/src/saved-views`;
- authenticated `POST /saved-views`, `GET /saved-views`,
  `GET /saved-views/:savedViewId/apply`, `PATCH /saved-views/:savedViewId`,
  and `DELETE /saved-views/:savedViewId` routes;
- portfolio saved-view criteria for statuses, attention queue, flags, risk, and
  confidence;
- comparison saved-view criteria for decisions, source types, note presence,
  and decision queues;
- built-in portfolio `needs_attention` queue grounded in current status, score
  flags, and confidence;
- built-in comparison `needs_decision` queue grounded in current decision state;
- frontend portfolio saved-view controls, queue activation, current-view label,
  and default-view reset;
- tests for creation, invalid criteria, listing, applying, ownership isolation,
  built-in queue behavior, web API calls, and frontend review helpers.

Not implemented:

- shared/team views;
- complex report builders;
- arbitrary SQL-like query criteria;
- spreadsheet exports;
- collaboration workflows;
- ML/AI prioritization;
- auction execution.

## Model Boundary

The saved view stores:

- `userId`;
- `surface`;
- `name`;
- optional `description`;
- validated `filters`;
- optional validated `sort`;
- timestamps.

The backend rejects unsupported filter fields. Criteria are deliberately small
and tied to fields already visible in portfolio or comparison responses.

## Apply Boundary

Applying a saved view first resolves the view by authenticated `userId`, unless
it is a built-in queue. It then lists only the authenticated user's records for
the target surface and applies the deterministic criteria in service code.

Portfolio apply responses include matching portfolio items plus a summary over
the matching set. Comparison apply responses include matching comparison items.

The frontend may use helper logic to keep the visible slice stable after local
state changes, but authorization and cross-user isolation remain backend
responsibilities.

## Attention Queue Signals

Current queue signals are conservative:

- portfolio `needs_attention`: active tracked items with `reviewing`, unresolved
  `tracked`, score flags, or low confidence;
- portfolio `recently_changed`: portfolio items whose status timestamp differs
  from tracked time;
- comparison `needs_decision`: undecided comparison items;
- comparison `recent_decisions`: comparison items whose decision timestamp
  differs from added time.

These queues are review aids, not urgency scores, predictive analytics, legal
advice, or financial recommendations.

## Security

Saved views are tenant-owned operational configuration. The implementation
requires:

- authentication for every route;
- lookup and mutation by `userId`;
- applying saved views only over records owned by the current user;
- route and service validation for criteria;
- no client-supplied `userId`;
- no exposure of hidden/internal fields or raw source rows.

Future additions such as shared views, exports, or collaboration must introduce
explicit ownership and access-control rules instead of reusing private saved
views implicitly.
