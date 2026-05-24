# Health API

## `GET /healthz`

Returns API runtime health.

### Response `200`

```json
{
  "service": "tax-lien-api",
  "status": "ok",
  "timestamp": "2026-05-24T00:00:00.000Z",
  "environment": "development"
}
```

## Unknown Routes

Unknown API routes return a structured 404:

```json
{
  "error": {
    "code": "route_not_found",
    "message": "The requested API route does not exist."
  }
}
```
