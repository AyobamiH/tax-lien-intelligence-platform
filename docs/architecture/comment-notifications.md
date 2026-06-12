# Comment Notification And Attention Architecture

Phase 32 adds bounded attention signals to Phase 31 workspace comments. It does
not turn comments into realtime chat or create a separate notification system.

## Attention Model

`DiscussionAttention` is keyed by user, workspace, related entity type, and
related entity id. It stores an unread count plus latest-comment and last-read
timestamps. This state is personal to the member but always bound to one
verified workspace thread.

When a comment is created:

1. the author is marked current on that thread;
2. every other active workspace member receives one unread increment;
3. only a transition from zero unread to one unread may create an alert;
4. later comments increase the count without creating repeated alerts;
5. after the member marks the thread read, a future comment can start a new
   alert cycle.

This avoids self-notification and limits alert/email noise while preserving the
actual unread comment count.

## Authorization

Comment list, create, and read-state routes require authentication, active
workspace membership, and access to the related entity through the selected
workspace compatibility tenant key. Attention queries include user id,
workspace id, entity type, and entity id, so one workspace cannot read or clear
another workspace's state.

## Alert And Delivery Boundary

`workspace_comment_added` uses the existing personal alert, notification
preference, email outbox, and digest pipeline. Its default preference is enabled
but in-app-only with digest cadence. A user may opt into delivery-eligible
immediate or digest email.

Alert and email payloads contain only a server-derived summary, workspace id,
comment id, actor identity, and related record identifiers. Comment body text is
never copied into alert metadata, email content, or digest content.

Comment persistence remains authoritative. Attention/notification fan-out is a
best-effort side effect after the comment is stored, avoiding a failed delivery
attempt causing duplicate comments on retry.

## Frontend

Supported record detail surfaces show `Up to date` or an unread count and
provide an explicit `Mark discussion read` action. Discussion alerts switch to
the alert's verified workspace before opening the related dataset, comparison,
watchlist, or portfolio surface.
Marking a discussion read also acknowledges matching unread discussion alerts
for that user, workspace, and record. Unrelated alerts are unchanged.

There is no global collaboration inbox, websocket delivery, mention parsing,
push/SMS, reactions, nested replies, task assignment, approval workflow, or
AI-generated discussion summary.
