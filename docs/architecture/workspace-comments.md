# Workspace Comments Architecture

Phase 31 adds contextual discussion to shared records without turning the
product into chat. Phase 32 adds bounded personal attention and notification
signals for that discussion.

## Model

`WorkspaceComment` stores:

- workspace id;
- verified actor user id and member-visible email snapshot;
- allowlisted related entity type and id;
- plain-text body with a 1,000-character maximum;
- created and updated timestamps.

Comments are indexed by workspace, entity type, entity id, creation time, and
id. Thread responses are bounded to the 200 most recent comments and returned
oldest first. Phase 31 uses author-requested hard deletion and does not
implement editing or nested replies.

## Target Authorization

List and create operations first validate the entity id and then resolve the
target through the existing dataset, comparison, watchlist, or portfolio store
using the workspace's server-derived compatibility `tenantUserId`.

The comment query also includes the verified workspace id. These two checks
prevent a target id or comment id from crossing workspace boundaries. A stale
or deleted target cannot be listed or commented on and returns the same
`comment_target_not_found` response as an inaccessible target.

All active members may list and create comments because discussion is additive
context rather than a mutation of the underlying decision record. Only the
verified original author may delete a comment.

## Content Safety

The service trims bodies, rejects empty text, enforces the 1,000-character
limit, and rejects unsafe control characters while allowing ordinary tabs and
line breaks. The frontend renders the body as a React text child with
`whitespace-pre-wrap`; it never uses raw HTML rendering.

## Frontend

The same compact discussion component appears on:

- dataset detail;
- selected comparison item detail;
- selected watchlist item detail;
- selected portfolio item detail.

Changing the selected record clears the previous thread and loads the newly
selected entity. Each surface includes loading, empty, error, create, actor,
timestamp, count, and author-delete states.

Phase 32 adds a personal `Up to date`/unread indicator and explicit
`Mark discussion read` action to the same component.

## Attention And Notifications

Discussion attention is stored separately per user, workspace, entity type, and
entity id. The author is marked current. Other active members receive an unread
increment, but an alert is generated only when a thread transitions from zero
unread to one unread for that member.

`workspace_comment_added` flows through existing personal notification
preferences, alerts, email outbox, and digest processing. No alert or delivery
payload contains comment body text. See
`docs/architecture/comment-notifications.md`.

## Activity Boundary

Comment creation does not emit Phase 30 workspace activity. This keeps the
operational feed focused on durable workflow changes and avoids duplicating a
discussion thread into a noisy workspace-wide transcript.

## Deferred

Realtime updates, rich text, mentions, push/SMS, attachments, reactions, nested
replies, editing, moderation consoles, tasks, approvals, and shared editing
indicators remain out of scope.
