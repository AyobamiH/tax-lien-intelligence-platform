# Follow Subscriptions Architecture

Phase 38 adds deliberate record watching for shared operational work. It is a
stakeholder-awareness layer, not social following or a general event system.

## Model

`FollowSubscription` stores:

- workspace id;
- follower user id;
- allowlisted target entity type and id;
- followed timestamp;
- created and updated timestamps.

A unique compound index on workspace, follower, target type, and target id
makes follow creation idempotent. Additional indexes support personal queues
and target follower lookup.

## Authorization

Every API route requires authentication and selected-workspace read access.
Follow creation and state retrieval reuse the shared target-access adapter.
Listing filters every stored subscription through current target access, so a
deleted or inaccessible record cannot leak through aggregation.

Unfollow is workspace- and actor-qualified but does not require the target to
still exist. This permits safe cleanup of stale subscriptions without revealing
the former target.

Follower counts include active workspace memberships only. The API exposes a
count, not follower identities.

## Notification Fan-Out

The follow service resolves active subscriptions for a target and creates
personal, preference-aware alerts for a small allowlist of consequential
changes:

- responsibility assignment or clear;
- portfolio status change;
- approval approve, reject, or cancel.

Alert creation is best effort after the authoritative action succeeds. The
actor is excluded, and assignment fan-out excludes the new assignee to avoid a
duplicate alongside the direct assignment alert. Follow event ids provide
stable delivery source keys.

The default `followed_item_changed` preference is enabled, in-app-only, and
digest-paced. Existing preference and delivery infrastructure governs
suppression and optional email eligibility.

## Frontend

Dataset, comparison, watchlist, and portfolio detail surfaces include one
compact follow toggle with loading, followed, follower-count, and error states.
My Work includes a separate Following queue. It is informational and does not
inflate `totalActionable`.

Workspace switches remount record surfaces so follow state cannot be reused
across tenant contexts.

## Deliberate Exclusions

This phase does not add public feeds, user following, reactions, mentions,
presence, recommendations, follower analytics, arbitrary event subscriptions,
or notification on every record mutation.
