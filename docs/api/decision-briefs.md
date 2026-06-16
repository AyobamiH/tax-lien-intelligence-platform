# Decision Briefs API

Phase 41 adds a narrow evidence-pack API for supported decision records. The
first supported target is a comparison item. This is not a report builder, PDF
studio, public sharing layer, or compliance evidence system.

All routes require authentication and active membership in the selected
`X-Workspace-Id`.

## `GET /decision-briefs/comparison_item/:entityId`

Returns a consolidated decision brief for an accessible comparison item.

The response includes:

- workspace id and generation timestamp;
- target comparison snapshot and summary;
- source dataset context when the dataset remains accessible;
- score, risk, flags, reasoning, and relevant timestamps;
- current assignment;
- review checklist state and required-item progress;
- pending/latest/recent approval state;
- current active/resolved final outcome state;
- workspace policy evaluations and unmet requirements;
- recent decision history;
- latest discussion comments plus the caller's unread discussion state;
- a plain-text `exportText` summary for copy/print workflows.

If the comparison item is not accessible in the selected workspace, the API
returns the same not-found behavior as the underlying comparison target access.
If the original dataset is stale or removed, the brief still returns the
comparison snapshot and omits `dataset`.

Unsupported entity types return `400 validation_failed`.

## Scope Notes

Decision briefs are read-only aggregation. They do not approve, hand off,
complete checklist items, modify policy, resolve outcomes, or bypass existing
enforcement.

The current implementation intentionally supports comparison items only. Future
portfolio or watchlist briefs should reuse the same selected-workspace and
target-access pattern before adding new entity types.
