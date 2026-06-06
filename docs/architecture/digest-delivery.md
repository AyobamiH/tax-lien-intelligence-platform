# Digest Delivery And History Architecture

Phase 28 makes digest delivery operational. Digest-eligible outbox records are
processed by the existing worker scheduler, grouped into tenant-owned batches,
sent through the Phase 27 email transport boundary, and exposed to users through
a safe delivery history view.

This remains product-alert delivery. It is not a marketing or general messaging
platform.

## Scheduled Processing

The worker registers `notification-digest-processing` with the internal
scheduler. The default processing interval is 24 hours and can be configured
with:

- `EMAIL_DIGEST_PROCESSING_INTERVAL_MS`;
- `EMAIL_DIGEST_MAX_USERS_PER_RUN`;
- `EMAIL_DIGEST_MAX_ITEMS_PER_BATCH`.

The task does not run immediately at worker startup. Each run is bounded by the
configured user and item limits.

## Batch Workflow

For each user with `digest_ready` email records:

1. create or reuse one digest batch for the current processing window;
2. atomically claim the batch from `pending` to `processing`;
3. atomically claim a bounded set of outbox records as `digest_processing`;
4. recheck current notification preferences for every claimed alert type;
5. suppress records that no longer allow digest delivery;
6. resolve the recipient from the batch owner's user record;
7. send one concise grouped email through the existing transport;
8. mark the batch and included outbox records `sent`, `failed`, or
   `provider_disabled`.

Batch uniqueness by `userId` and window key prevents duplicate batches in the
same processing window. Outbox claim filters prevent one alert from being
included in multiple batches.

There is one provider attempt per batch. Failed batches are recorded for
visibility and are not retried in a hidden loop.

## Data Model

`NotificationDigestBatch` stores:

- `userId`;
- unique processing window key;
- status;
- included item count;
- safe subject;
- provider/message identifiers for server troubleshooting;
- attempt count;
- start/sent timestamps;
- bounded failure state;
- created/updated timestamps.

Each claimed `NotificationDelivery` record receives `digestBatchId`, creating a
clear batch-to-outbox link.

Batch statuses:

- `pending`;
- `processing`;
- `sent`;
- `failed`;
- `provider_disabled`;
- `suppressed`;
- `empty`.

## Delivery History

`GET /notification-deliveries` returns the authenticated user's recent delivery
records and digest batches. The frontend exposes this at
`#/delivery-history`.

The public history projection includes safe subjects, summaries, status,
cadence, attempts, batch linkage, timestamps, and generic failure messages. It
does not expose:

- recipient email addresses;
- provider message ids;
- raw SMTP/provider errors;
- another user's records;
- secrets or provider config.

## Digest Content

Digest email is plain text and concise:

- number of included events;
- subject and summary for each event;
- safe dataset/job identifiers where available;
- why the user is receiving a digest;
- optional workspace URL;
- an explicit product-alert, non-marketing statement.

## Security And Boundaries

- provider config remains env-only;
- recipient identity comes from the alert owner's user record;
- current preferences are checked again at send time;
- disabled providers fail safely into recorded state;
- processing is bounded and scheduled through the existing worker;
- history is authenticated and owner-scoped;
- SMS, push, realtime messaging, campaigns, template builders, shared policies,
  collaboration, ML/AI prioritization, and auction execution remain out of
  scope.
