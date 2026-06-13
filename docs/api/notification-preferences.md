# Notification Preferences API

Phase 26 added tenant-owned notification preferences for the current alert
system. Phase 27 adds the email delivery foundation behind those preferences,
and Phase 28 processes digest cadence through the worker scheduler.
Preferences control whether supported alert types are enabled, in-app only,
delivery-eligible immediate email, or scheduled digest email.

This is not SMS delivery, push delivery, marketing messaging, websocket push,
or a general rules engine. Email sends only when env-driven SMTP config is
complete; otherwise delivery-eligible alerts are tracked as provider-disabled
outbox records.

All routes require `Authorization: Bearer <jwt-access-token>`.

## Supported Alert Types

- `scoring_job_completed`
- `scoring_job_failed`
- `workspace_comment_added`
- `workspace_item_assigned`

## Preference Fields

Each rule includes:

- `alertType`;
- `enabled`;
- `deliveryMode`: `in_app_only` or `delivery_eligible`;
- `cadence`: `immediate` or `digest`.

`delivery_eligible` can send immediate product-alert email for supported alert
types when SMTP is enabled. Digest cadence writes digest-ready outbox records
that the worker groups and processes on schedule.

## `GET /notification-preferences`

Returns the authenticated user's preferences, creating defaults if none exist.

Response `200`:

```json
{
  "preferences": {
    "id": "notification-preference-id",
    "rules": [
      {
        "alertType": "scoring_job_completed",
        "enabled": true,
        "deliveryMode": "in_app_only",
        "cadence": "digest"
      },
      {
        "alertType": "scoring_job_failed",
        "enabled": true,
        "deliveryMode": "delivery_eligible",
        "cadence": "immediate"
      },
      {
        "alertType": "workspace_comment_added",
        "enabled": true,
        "deliveryMode": "in_app_only",
        "cadence": "digest"
      },
      {
        "alertType": "workspace_item_assigned",
        "enabled": true,
        "deliveryMode": "in_app_only",
        "cadence": "digest"
      }
    ],
    "createdAt": "2026-06-01T10:00:00.000Z",
    "updatedAt": "2026-06-01T10:00:00.000Z"
  },
  "categories": [
    {
      "alertType": "scoring_job_failed",
      "label": "Scoring failed",
      "description": "A scoring or refresh job failed and may need operator attention.",
      "supportsDelivery": true,
      "supportsDigest": true,
      "defaultRule": {
        "alertType": "scoring_job_failed",
        "enabled": true,
        "deliveryMode": "delivery_eligible",
        "cadence": "immediate"
      }
    }
  ]
}
```

## `PATCH /notification-preferences`

Updates the authenticated user's preference rules. The backend validates alert
types, duplicate rules, delivery modes, and cadence values.

Request:

```json
{
  "rules": [
    {
      "alertType": "scoring_job_completed",
      "enabled": false,
      "deliveryMode": "in_app_only",
      "cadence": "digest"
    },
    {
      "alertType": "scoring_job_failed",
      "enabled": true,
      "deliveryMode": "delivery_eligible",
      "cadence": "immediate"
    }
  ]
}
```

Response `200` matches the `GET /notification-preferences` shape.

## Delivery Preparation And Email Outbox

Supported product alerts now receive an internal delivery classification:

- `suppressed` when disabled by preference;
- `in_app_only` when the alert should remain in the app;
- `delivery_immediate` when eligible for immediate product-alert email;
- `delivery_digest` when eligible for scheduled grouped email delivery.

Delivery-preparation payloads are provider-agnostic and contain safe summaries
plus bounded alert metadata. They do not include raw source rows, stack traces,
comment body text, assigned-record content, or external provider details.

The delivery service writes outbox records for supported job alerts:

- `suppressed`;
- `in_app_only`;
- `digest_ready`;
- `digest_processing`;
- `pending`;
- `sent`;
- `failed`;
- `provider_disabled`.

Email is disabled by default. To enable immediate email sends, configure:

- `EMAIL_DELIVERY_ENABLED=true`;
- `EMAIL_FROM_ADDRESS`;
- `SMTP_HOST`;
- optional SMTP port, credentials, secure mode, reply-to, sender name, and app
  base URL.

If config is missing, delivery-ready immediate alerts still create in-app alerts
and provider-disabled outbox records. Scheduled digest processing follows the
same provider-disabled-safe behavior. Delivery outcomes are available through
`GET /notification-deliveries`. SMS and push are future channels.

## Errors

Possible notification preference errors:

- `auth_missing_token`
- `notification_preferences_invalid_rules`
- `notification_preferences_duplicate_rule`
- `notification_preferences_invalid_alert_type`
- `notification_preferences_invalid_delivery_mode`
- `notification_preferences_invalid_cadence`
- `notification_preferences_invalid_enabled`

Notification preferences are tenant-owned configuration. There is no cross-user
access, shared policy, team notification model, SMS/push delivery, or marketing
messaging in this phase.
