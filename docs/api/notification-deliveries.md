# Notification Deliveries API

Phase 28 adds authenticated delivery history for immediate product-alert email,
scheduled digest batches, suppressions, provider-disabled outcomes, and
failures.

All routes require `Authorization: Bearer <jwt-access-token>`.

## `GET /notification-deliveries`

Returns recent delivery records and digest batches owned by the authenticated
user.

Response `200`:

```json
{
  "deliveries": [
    {
      "id": "delivery-id",
      "alertType": "scoring_job_completed",
      "channel": "email",
      "status": "sent",
      "deliveryMode": "delivery_eligible",
      "cadence": "digest",
      "subject": "Scoring completed",
      "summary": "Scoring completed. 12 records are ready for review.",
      "relatedEntityType": "dataset",
      "relatedEntityId": "dataset-id",
      "digestBatchId": "digest-batch-id",
      "attempts": 1,
      "preparedAt": "2026-06-06T00:00:00.000Z",
      "sentAt": "2026-06-06T01:00:00.000Z",
      "updatedAt": "2026-06-06T01:00:00.000Z"
    }
  ],
  "digestBatches": [
    {
      "id": "digest-batch-id",
      "status": "sent",
      "itemCount": 1,
      "subject": "1 update in your tax lien workspace",
      "attempts": 1,
      "sentAt": "2026-06-06T01:00:00.000Z",
      "createdAt": "2026-06-06T01:00:00.000Z",
      "updatedAt": "2026-06-06T01:00:00.000Z"
    }
  ]
}
```

Possible delivery statuses:

- `suppressed`
- `in_app_only`
- `digest_ready`
- `digest_processing`
- `pending`
- `sent`
- `failed`
- `provider_disabled`

Possible digest batch statuses:

- `pending`
- `processing`
- `sent`
- `failed`
- `provider_disabled`
- `suppressed`
- `empty`

Failure messages are safe product-level descriptions. Raw provider errors,
recipient email addresses, provider message ids, provider config, and secrets
are never returned.

Empty history returns:

```json
{
  "deliveries": [],
  "digestBatches": []
}
```

## Security

- ownership is derived from the authenticated token;
- the client does not send `userId`;
- only the authenticated user's delivery and batch records are queried;
- no cross-user history endpoint exists;
- unauthenticated requests return `auth_missing_token`.

This API supports product-alert trust and troubleshooting. It is not a campaign,
marketing, SMS, push, or realtime messaging API.
