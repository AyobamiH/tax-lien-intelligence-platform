# Notification Preferences API

Phase 26 adds tenant-owned notification preferences for the current alert
system. Preferences control whether supported alert types are enabled, in-app
only, or delivery-ready for future provider integration.

This is not an email/SMS rollout, marketing messaging system, websocket push
service, or rules engine.

All routes require `Authorization: Bearer <jwt-access-token>`.

## Supported Alert Types

- `scoring_job_completed`
- `scoring_job_failed`

## Preference Fields

Each rule includes:

- `alertType`;
- `enabled`;
- `deliveryMode`: `in_app_only` or `delivery_eligible`;
- `cadence`: `immediate` or `digest`.

`delivery_eligible` does not send external messages yet. It classifies alerts
for provider-agnostic delivery preparation.

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

## Delivery Preparation

Job-generated alerts now receive an internal delivery classification:

- `suppressed` when disabled by preference;
- `in_app_only` when the alert should remain in the app;
- `delivery_immediate` when eligible for future immediate delivery;
- `delivery_digest` when eligible for future grouped delivery.

Delivery-preparation payloads are provider-agnostic and contain safe summaries
plus bounded alert metadata. They do not include raw source rows, stack traces,
or external provider details.

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
access, shared policy, team notification model, or external provider delivery in
this phase.
