# Intelligence Service Architecture

## Boundary

`services/intelligence` is a stateless Python process that receives
`CandidateEvidenceV1` and returns `EngineResultV1`. The existing TypeScript API
remains the tenant-aware workflow and system of record. The service has no
MongoDB credentials, user session, bidding authority, or ability to mutate a
portfolio.

The service performs four bounded operations:

1. strict request and provenance validation;
2. exact jurisdiction rule-pack selection;
3. deterministic rule evaluation and evidence digesting;
4. output validation before HTTP serialization.

There is no provider fallback. A missing rule pack, missing evidence, or
missing model artifact becomes an explicit contract state.

## Runtime Shape

- Python 3.12 standard library only;
- bounded threaded internal HTTP server;
- default 1 MiB request-body limit and 10-second socket-read timeout;
- bearer authentication using constant-time token comparison;
- health and version endpoints without source-record data;
- safe JSON errors without input echo or stack traces;
- graceful `SIGTERM` and `SIGINT` shutdown;
- non-root container image and health check;
- no outbound network, database, filesystem-write, or LLM path.

The included server is an internal service runtime, not an internet edge. A
production deployment must use private networking, secret injection, transport
security at the service mesh or trusted proxy, process supervision, and normal
observability. Deployment is not performed or claimed in this node.

## Cross-Language Parity

The TypeScript and Python implementations deliberately share contract,
engine, rule-pack, and evidence-digest version identifiers. Their current
rules are duplicated implementations, so parity is an enforced gate rather
than an assumption.

`tests/integration/intelligence-service.test.ts` starts the real Python process
on an ephemeral loopback port, sends fractional numeric evidence over HTTP,
validates the returned `EngineResultV1` with the TypeScript validator, and
compares the entire result to the TypeScript rule evaluator using the service's
generation timestamp. This covers:

- UTF-8 and IEEE-754 evidence digest parity;
- result status and version parity;
- signal values, methods, units, and evidence references;
- findings, missing evidence, and limitations;
- authenticated transport behavior;
- invalid evidence and unsupported-jurisdiction behavior.

Python unit tests separately exercise its runtime validators, abstention,
digest stability, and refusal to emit values on unavailable signals. CI sets up
Python 3.12, compiles the service, runs its unit tests as part of `npm test`,
builds it as part of `npm run build`, and runs the real-process smoke.

## Evidence Digest

Both runtimes use the same tagged canonical encoding:

- object keys are UTF-8 hex and sorted by encoded bytes;
- arrays preserve order;
- strings use UTF-8 hex;
- numbers use big-endian IEEE-754 double bytes;
- booleans and null use distinct tags.

The lowercase SHA-256 digest of this encoding is stored in every engine
result. This is a content-integrity reference, not a digital signature and not
proof that a source authority is truthful.

## Security And Failure Model

Evaluation is denied unless the internal token is valid. Error responses close
the connection so an unread rejected body cannot be interpreted as a later
request on the same HTTP connection. Oversized, untyped, malformed, or
contract-invalid requests are rejected before evaluation.

The service validates every generated result again. If its own output violates
the contract, it returns a safe `engine_contract_violation` error instead of
serializing a partial or fabricated result.

Tenant authorization remains a platform-API responsibility in the next node.
The internal bearer token authenticates the calling service, not the end user.

## Explicit Limits

- no current Maricopa auction feed or operational auction rules;
- no trained or promoted model artifact;
- no redemption probability, AVM, or liquidity prediction;
- no persistence, cache, queue, idempotency store, or retry orchestrator;
- no deployed service, load test, TLS proof, or production traffic proof;
- no ChatGPT tool exposure.

These limits are promotion gates, not fields to fill with placeholders.
