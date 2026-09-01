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

When `SOURCE_REVISION` is configured as an exact lowercase 40-character Git
commit, `/healthz` also returns
`X-Tax-Lien-Source-Revision: <revision>`. The governed staging deployment uses
this non-secret header to identify the declared source revision of the
responding container; it does not add the revision to the JSON body.

## `GET /readyz`

Returns dependency readiness without connection strings, hosts, credentials,
or exception text. The response is `200` only when MongoDB is connected and the
intelligence service is either disabled by configuration or returns its real
health response. It returns `503` when either required dependency is
unavailable.

`/readyz` returns the same optional `X-Tax-Lien-Source-Revision` header. The
private-staging workflow requires three consecutive `200` responses bearing
the dispatched revision before it begins public, OAuth, log, or rollback
verification. A healthy response without the exact header is not promotion
evidence.

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
