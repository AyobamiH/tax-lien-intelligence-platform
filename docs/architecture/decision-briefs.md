# Decision Brief Architecture

Phase 41 adds a bounded decision brief layer for comparison items. The brief is
an evidence pack assembled from existing authoritative services; it does not
persist new report records and does not create a workflow engine.

## Current Scope

Supported target:

- `comparison_item`

The brief aggregates:

- comparison target snapshot;
- source dataset readiness and import context when still available;
- score/risk values, flags, reasoning, and timestamps;
- current workspace assignment;
- review checklist state and required-item progress;
- approval request status for the comparison-to-portfolio checkpoint;
- active/resolved final outcome state;
- workspace policy evaluations for comparison handoff actions;
- recent decision history;
- latest discussion and caller-specific unread state;
- plain-text export text for copy/print use.

## Security Boundary

The route requires authentication and active selected-workspace membership.
Before any surrounding evidence is returned, the service loads the comparison
item through the existing workspace tenant user boundary. Assignment,
checklist, comment, approval, and policy evidence then use their existing
workspace-scoped services.

Cross-workspace targets fail before aggregation. Missing source datasets are
treated as stale evidence and omitted, because the comparison snapshot remains
the record under review.

## Product Boundary

Decision briefs are read-only. They help reviewers understand whether the
record is ready, what remains blocked, and what evidence exists. They do not:

- approve or reject requests;
- complete checklist items;
- execute handoff;
- resolve final outcomes;
- create public links;
- create PDFs;
- claim legal custody or compliance completeness;
- generate AI-written recommendations.

Future entity types can be added only when their target access, policy,
history, and discussion boundaries are equally explicit.
