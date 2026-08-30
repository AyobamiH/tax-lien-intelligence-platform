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

`/healthz` is a liveness check. It does not claim that MongoDB or the internal
intelligence service is reachable.

## `GET /readyz`

Returns dependency readiness without connection strings, hosts, credentials,
or exception text. The response is `200` only when MongoDB is connected and the
intelligence service is either disabled by configuration or returns its real
health response. It returns `503` when either required dependency is
unavailable.

```json
{
  "service": "tax-lien-api",
  "status": "ready",
  "timestamp": "2026-08-30T20:30:00.000Z",
  "environment": "production",
  "dependencies": {
    "mongodb": "connected",
    "intelligence": "ready"
  }
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
