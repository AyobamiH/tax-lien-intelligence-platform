# Workspace Policy Enforcement Architecture

Phase 40 adds one workspace-scoped policy document with three fixed boolean
rules. Fixed fields keep validation, administration, and enforcement explicit;
there is no expression language, custom workflow graph, or per-user exception
layer.

Policy state defaults to disabled when no document exists. This is the
compatibility boundary for workspaces and records created before Phase 40.
Owners and admins may replace the full rule set. Members may read it and receive
the same unmet-requirement guidance when an action is blocked.

The policy service derives evidence from existing authoritative services:

- assignment state comes from workspace assignments and current target access;
- checklist readiness comes from the active comparison checklist snapshot;
- approval satisfaction is supplied only by the approved execution path.

Enforcement is deliberately limited to comparison handoffs and the existing
comparison-to-portfolio approval checkpoint. Direct portfolio handoff can be
blocked by the approval rule, while approval execution bypasses only that one
requirement and still rechecks assignment and checklist evidence.

Policy failures are non-mutating `409` responses with structured unmet
requirements. They do not create alerts or activity entries, avoiding noise
from repeated blocked clicks. Policy updates are timestamped but Phase 40 does
not claim compliance-grade audit history.
