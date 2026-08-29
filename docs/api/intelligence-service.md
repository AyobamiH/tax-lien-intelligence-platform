# Intelligence Service API

The Phase 47 intelligence service is an internal Python HTTP boundary for
versioned candidate evidence and engine results. It is stateless and has no
database access, tenant authority, auction execution capability, LLM call, or
model provider.

The platform API is not integrated with this service yet. That tenancy-safe
compatibility work belongs to `P47-050-platform-integration`.

## Runtime

The service uses Python 3.12 and the standard library only. Start it with a
strong internal bearer token:

```bash
PYTHONPATH=services/intelligence/src \
INTELLIGENCE_SERVICE_TOKEN=replace-with-at-least-32-random-characters \
python3 -m tax_lien_intelligence.server
```

Default bind address is `127.0.0.1:8081`. Container runtime sets
`INTELLIGENCE_HOST=0.0.0.0`; it must remain on a private service network behind
the platform API or a trusted reverse proxy. It is not a public browser API.

## `GET /health`

Returns liveness and active contract/engine versions. It does not claim that a
trained model exists.

### Response `200`

```json
{
  "service": "tax-lien-intelligence",
  "status": "ok",
  "timestamp": "2026-08-29T10:00:00.000Z",
  "contractVersion": "1.0.0",
  "engineVersion": "jurisdiction-rules-1.1.0"
}
```

## `GET /version`

Returns service, contract, evidence-schema, engine, and rule-pack versions,
plus the verified statutory source manifest. `modelArtifacts` is an empty
array until a trained artifact passes the later promotion gates.

Current rule-pack metadata also exposes
`operationalAuctionRulesStatus: "not_verified"` so consumers cannot mistake
the Arizona statutory baseline for current Maricopa auction instructions.

## `POST /v1/evaluate`

Validates and evaluates one `CandidateEvidenceV1` document. The caller must
send:

- `Authorization: Bearer <INTELLIGENCE_SERVICE_TOKEN>`;
- `Content-Type: application/json`;
- a valid `Content-Length` no larger than the configured body limit;
- a complete `CandidateEvidenceV1` request body.

### Response `200`

Returns one contract-valid `EngineResultV1`. Possible result statuses are:

- `assessed` for evidence-supported deterministic evaluation in a registered
  jurisdiction;
- `insufficient_evidence` when core evidence is missing;
- `out_of_scope` when no verified jurisdiction rule pack matches.

The current service calculates only value coverage. It always returns
redemption probability as unavailable because no promoted model artifact is
registered.

### Error responses

| Status | Code | Meaning |
| --- | --- | --- |
| `400` | `json_invalid` | Body is not valid UTF-8 JSON |
| `400` | `evidence_invalid` | Candidate violates the evidence contract |
| `401` | `service_auth_required` | Bearer token is absent or invalid |
| `411` | `content_length_required` | Request length is not declared |
| `413` | `request_too_large` | Body exceeds the configured maximum |
| `415` | `content_type_unsupported` | Body is not declared as JSON |
| `500` | `engine_contract_violation` | Service refused to emit invalid output |
| `500` | `engine_internal_error` | Safe unexpected failure response |

Errors use the repository's structured error envelope. Validation details
contain field paths and messages but never echo source records, bearer tokens,
stack traces, or runtime internals.

## Environment

| Variable | Default | Requirement |
| --- | --- | --- |
| `INTELLIGENCE_HOST` | `127.0.0.1` | Bind address |
| `INTELLIGENCE_PORT` | `8081` | Port from 0 to 65535; 0 is test-only ephemeral binding |
| `INTELLIGENCE_MAX_BODY_BYTES` | `1048576` | Positive request-body ceiling |
| `INTELLIGENCE_SERVICE_TOKEN` | none | Required and at least 32 characters |
| `INTELLIGENCE_ALLOW_INSECURE_LOCALHOST` | false | Explicit local-only bypass when no token is set |

Insecure mode is accepted only on a loopback bind address. It must never be
enabled in a shared or production environment.
