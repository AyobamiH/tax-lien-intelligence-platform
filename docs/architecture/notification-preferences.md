# Notification Preferences And Email Delivery Foundation Architecture

Phase 26 added tenant-owned notification preferences and provider-agnostic
delivery preparation. Phase 27 adds the first email delivery foundation:
preference-aware immediate email for supported product alerts, Mongo-backed
outbox tracking, SMTP transport wiring, and digest-ready batching records.

Email delivery is disabled by default. It sends only when email delivery is
enabled and required SMTP/sender env config is complete.

## Current Implementation

Implemented through Phase 27:

- tenant-owned notification preference model in `packages/db`;
- notification preference store/service boundaries in
  `apps/api/src/notification-preferences`;
- authenticated `GET /notification-preferences` and
  `PATCH /notification-preferences` routes;
- explicit rules for `scoring_job_completed` and `scoring_job_failed`;
- `enabled`, `deliveryMode`, and `cadence` controls;
- job-alert suppression when a supported alert type is disabled;
- provider-agnostic delivery-preparation payloads with safe metadata;
- tenant-owned `NotificationDelivery` outbox model in `packages/db`;
- notification delivery store/service boundary in
  `apps/api/src/notification-delivery`;
- provider-agnostic email transport interface;
- SMTP transport implementation driven by env config;
- immediate email send path for delivery-eligible immediate alerts;
- provider-disabled outbox records when SMTP config is incomplete;
- failure outbox records when the provider rejects a message;
- duplicate-send avoidance by unique user/source/channel outbox keys;
- digest-ready outbox records for delivery-eligible digest alerts;
- frontend notification preferences page using `#/notifications`;
- tests for preference-enabled delivery, suppressed alerts, immediate success,
  disabled config, provider failure, duplicate-send avoidance, digest grouping,
  ownership-safe recipient resolution, and email content generation.

Not implemented:

- SMS delivery;
- push notifications;
- marketing or lifecycle messaging;
- user-facing digest send scheduler;
- realtime websocket push;
- team/shared notification policies;
- complex rules engines;
- ML/AI prioritization;
- collaboration workflows;
- auction execution.

## Preference Model

The preference record stores:

- `userId`;
- rules by supported alert type;
- enabled/disabled state;
- `in_app_only` or `delivery_eligible`;
- `immediate` or `digest` cadence;
- timestamps.

There is one preference document per user. Defaults are created when the user
first retrieves preferences.

## Delivery Classification

When scoring jobs generate alerts, the alert service asks the notification
preference service to classify the alert:

- disabled rules suppress alert creation and write a suppressed outbox record;
- in-app-only rules create normal in-app alerts and an `in_app_only` outbox
  record;
- delivery-ready immediate rules create alerts with `delivery_immediate` and
  flow into the email send path;
- delivery-ready digest rules create alerts with `delivery_digest` and write
  `digest_ready` outbox records for later batching.

The preparation payload contains a subject, summary, related entity ids, and
bounded alert metadata such as job id, dataset id, request kind, record count,
or error code. It deliberately avoids raw dataset rows, stack traces, provider
configuration, or broad internal job payloads.

## Email Delivery Boundary

The delivery service owns email send decisions. It receives the prepared alert,
checks the delivery state, creates or reuses an outbox entry, resolves the
recipient from the alert owner's user record, and calls the configured transport
only for immediate email-eligible alerts.

Outbox statuses:

- `suppressed`;
- `in_app_only`;
- `digest_ready`;
- `pending`;
- `sent`;
- `failed`;
- `provider_disabled`.

Outbox records include `userId`, optional `alertId`, a unique source key,
channel, alert type, delivery mode, cadence, safe subject/summary metadata,
recipient email where resolved, provider ids, attempts, failure reason, and
timestamps.

The unique source key is `alert:<alertId>` for created alerts and
`job:<jobId>:<alertType>` for suppressed job alerts. This keeps repeated hooks
from sending the same product alert more than once.

## SMTP Configuration

Email delivery is env-driven and disabled by default.

Relevant env variables:

- `EMAIL_DELIVERY_ENABLED`;
- `EMAIL_FROM_ADDRESS`;
- `EMAIL_FROM_NAME`;
- `EMAIL_REPLY_TO`;
- `EMAIL_APP_BASE_URL`;
- `SMTP_HOST`;
- `SMTP_PORT`;
- `SMTP_USERNAME`;
- `SMTP_PASSWORD`;
- `SMTP_SECURE`;
- `SMTP_CONNECTION_TIMEOUT_MS`.

`EMAIL_DELIVERY_ENABLED=true` is not enough by itself. The API enables email
sends only when `EMAIL_FROM_ADDRESS` and `SMTP_HOST` are also present. Missing
config does not crash startup; delivery-eligible alerts become
`provider_disabled` outbox records.

## Digest Foundation

Digest sending is not scheduled yet. Phase 27 intentionally stops at
digest-ready outbox grouping:

- preference rules can classify supported alerts as `delivery_digest`;
- delivery service records them as `digest_ready`;
- the store can list digest-ready email records by user in created order.

A later digest phase can add grouping windows, rendered digest content, send
state transitions, rate limits, and scheduler/worker execution without changing
the preference contract.

## Security

Notification preferences and delivery records are tenant-owned configuration and
workflow state. The implementation requires:

- authentication for every preference route;
- preference lookup/upsert by authenticated `userId`;
- no client-supplied `userId`;
- validation against known alert types and delivery options;
- delivery preparation over the alert being generated for the current user;
- recipient lookup by alert owner;
- no cross-user preference, alert, or outbox leakage;
- no raw uploaded rows, stack traces, tokens, SMTP passwords, or provider
  payloads in email content or outbox metadata.

Email messages are product alerts about the user's tax lien review workspace,
not marketing messages. SMS and push remain future channels that require their
own opt-in, provider, retry, rate-limit, unsubscribe, and audit design.
