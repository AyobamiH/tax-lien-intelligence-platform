# ChatGPT Private-Staging Topology

## Decision

Private staging uses one Cloudflare Worker gateway and one Cloudflare Container
instance. The container runs the existing Node/Express API and the unchanged
Python intelligence service as separate supervised processes. MongoDB remains
an external managed persistence service reached only by the API.

This is the least-authority topology that preserves the current application
and OAuth atomicity without rewriting the Python service, copying engine logic,
or treating an ephemeral container disk as a database.

## Runtime Map

| Boundary | Responsibility | Public exposure |
| --- | --- | --- |
| Cloudflare Worker | Stable HTTPS, exact-origin enforcement, route allowlist, body bound, edge rate limits, payload-free gateway logs | Only `/healthz`, `/readyz`, OAuth discovery/lifecycle, and `/mcp` |
| One Cloudflare Container | Node API on `4000`; Python intelligence service on loopback `8081`; graceful process supervision | No direct public route |
| Managed MongoDB | Users, workspaces, evidence, workflow records, hashed OAuth grants, refresh families, and access-token revocation | No public application endpoint; TLS connection from the container only |
| ChatGPT developer-mode product | OAuth public client and consumer of exactly six read-only MCP tools | Private connection only |

The Python service remains stateless and receives no MongoDB credential. The
Node API is the only process that connects to MongoDB. A database outage keeps
the API from starting or makes `/readyz` fail closed; an intelligence-service
outage also makes readiness fail closed when intelligence is enabled.

## Why MongoDB Remains

The product needs durable persistence, but it does not need a separately
published Mongo API. Existing Mongoose models already hold tenant identity,
workspace membership, datasets, scored evidence, decision workflows, and OAuth
revocation state. OAuth code consumption and refresh rotation rely on atomic
Mongo updates and TTL indexes.

Replacing MongoDB during the ChatGPT staging gate would add a migration without
removing a release risk. Running MongoDB inside the Cloudflare Container would
be unsafe because container disk is ephemeral. A managed external Mongo
deployment with TLS, a staging-only least-privilege user, backup/restore, and a
private or tightly restricted network path is the bounded choice.

## Ingress And Rate Limits

`infra/cloudflare/src/gateway-policy.ts` denies every route except the release
surface. Upload, registration, dataset mutation, scoring mutation, bid,
purchase, and general application routes are not admitted by the Worker.
The gateway streams request bodies into a hard 1 MiB cap before invoking the
container, including when a client omits `Content-Length`.

The gateway uses Cloudflare rate-limit bindings for OAuth and MCP traffic. The
bindings are per Cloudflare location and intentionally permissive, so they are
an ingress abuse layer rather than billing or global-quota truth. The one
container instance retains the API's process-local OAuth limiter. Staging must
remain single-instance until a globally shared application limiter is adopted
and verified.

## Secrets And Configuration

The Worker passes only these secret-name bindings into the container:

- `STAGING_ORIGIN`;
- `MONGODB_URI`;
- `JWT_SECRET`;
- `INTELLIGENCE_SERVICE_TOKEN`;
- `MCP_OAUTH_SIGNING_SECRET`.

Secret values are never stored in repository files or receipts. The exact
staging origin is derived from the authorized account's workers.dev subdomain
and injected as a binding so OAuth issuer, MCP resource, and app links cannot
drift from the deployed URL. GitHub environment references flow to Wrangler
over stdin; no secret file is created, and preflight lists secret names only.

`SOURCE_REVISION` is a separate non-secret plain variable injected from the
GitHub workflow SHA. The Worker passes it to the container, and only
`/healthz` and `/readyz` expose it as `X-Tax-Lien-Source-Revision`. Promotion
does not begin until three consecutive readiness responses identify the exact
dispatched revision.

## Observability And Rollback

The API and gateway record request or lifecycle events with route class,
status/error class, duration, bounded response size where available, interface
version, and `payload_not_logged`. They do not record query strings, prompts,
tool arguments, authorization headers, credentials, email addresses, source
rows, or evidence payloads.

The deployment uses one versioned Worker and container image. Wrangler
returning success starts a container rollout but does not prove that the new
image is the only image answering. The workflow requests immediate rollout,
then waits for exact-revision convergence before public or authenticated live
checks. Rollback promotes the prior verified Worker version and separately
proves both 100% Worker routing and the exact current source revision of the
bound container on health/readiness. Recovery restores the current Worker and
repeats both proofs. Mongo state and the bound container are not rolled back
with the Worker; token-family revocation remains an explicit incident action.

## Live Boundary

Repository source does not prove that the Cloudflare account has a Workers Paid
plan, an authorized workers.dev origin, the five required secret bindings, or
a managed staging Mongo deployment. Prior governed runs verified those
prerequisites and archived sanitized endpoint receipts. Docker remains
unavailable in the current workspace, so the rollout correction still requires
exact-head CI plus a new live staging receipt; source review alone does not
prove the new revision is serving.

Current platform references:

- [Cloudflare Containers](https://developers.cloudflare.com/containers/)
- [Container secrets](https://developers.cloudflare.com/containers/examples/env-vars-and-secrets/)
- [Workers rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Container rollouts](https://developers.cloudflare.com/containers/configuration/rollouts/)
- [Connect and test a ChatGPT plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [Plugin OAuth](https://developers.openai.com/plugins/build/auth)
