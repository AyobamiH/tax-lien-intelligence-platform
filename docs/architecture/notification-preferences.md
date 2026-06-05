# Notification Preferences And Delivery Foundation Architecture

Phase 26 adds a controlled notification preference layer on top of the existing
in-app alerts system. It lets users decide which generated alert types matter,
whether they stay in-app only, and whether they are eligible for future
provider-backed delivery.

This phase does not send email or SMS. It creates provider-agnostic delivery
classification and safe preparation metadata only.

## Current Implementation

Implemented in Phase 26:

- tenant-owned notification preference model in `packages/db`;
- notification preference store/service boundaries in
  `apps/api/src/notification-preferences`;
- authenticated `GET /notification-preferences` and
  `PATCH /notification-preferences` routes;
- explicit rules for `scoring_job_completed` and `scoring_job_failed`;
- `enabled`, `deliveryMode`, and `cadence` controls;
- job-alert suppression when a supported alert type is disabled;
- delivery classification for in-app-only, immediate delivery-ready, and
  digest-ready alerts;
- provider-agnostic delivery-preparation payloads with safe metadata;
- frontend notification preferences page using `#/notifications`;
- tests for defaults, updates, invalid payloads, preference application,
  delivery classification, API client calls, and presentation helpers.

Not implemented:

- email/SMS provider rollout;
- marketing or lifecycle messaging;
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

- disabled rules suppress alert creation;
- in-app-only rules create normal in-app alerts with delivery state
  `in_app_only`;
- delivery-ready immediate rules create alerts with `delivery_immediate`;
- delivery-ready digest rules create alerts with `delivery_digest`.

The preparation payload contains a subject, summary, related entity ids, and
bounded alert metadata such as job id, dataset id, request kind, record count,
or error code. It deliberately avoids raw dataset rows, stack traces, provider
configuration, or broad internal job payloads.

## Security

Notification preferences are tenant-owned configuration. The implementation
requires:

- authentication for every route;
- preference lookup/upsert by authenticated `userId`;
- no client-supplied `userId`;
- validation against known alert types and delivery options;
- delivery preparation over the alert being generated for the current user;
- no cross-user preference or alert leakage.

Future external delivery must add provider-specific security, retry,
unsubscribe, rate-limit, and audit behavior before sending any messages.
