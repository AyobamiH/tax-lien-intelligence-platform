# Review Checklist Architecture

Phase 39 adds a bounded decision-discipline layer over existing shared record
access. It does not add compliance evidence management, attachments,
e-signatures, arbitrary workflows, or automated review.

Each workspace may configure one versioned template for each supported target
type: comparison item, watchlist item, and portfolio item. Templates contain
stable ordered item ids, bounded labels, required flags, active state, actor
ids, and timestamps.

A record checklist is created lazily when an accessible record is first read.
It snapshots the applicable template and stores item completion, completing
actor, and completion timestamp.

When a template changes, the next record read synchronizes its snapshot:

- completion is preserved for stable item ids;
- new items begin incomplete;
- removed items leave the active snapshot;
- current labels, required flags, and ordering replace older presentation.

Owners and admins manage templates. Any active member may complete items on a
record they can already access. Checklist state never grants record access,
assignment, approval authority, or another workspace role.

The comparison handoff and approval area displays checklist readiness as a
warning or confidence signal. Phase 39 does not hard-block those actions and
does not emit activity or alerts for each toggle.
