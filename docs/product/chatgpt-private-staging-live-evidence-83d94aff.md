# ChatGPT private staging live evidence — `83d94aff`

## Decision

The governed private-staging deployment is **verified** for exact revision
`83d94aff19ead3209381320881776a2ee01632a5`. The product remains
`private_staging_deployed`; it is not yet represented as connected to a real
private ChatGPT account and `P47-093-chatgpt-private-staging` remains in
progress.

## Source and workflow provenance

- Green merged-main revision: `f80b7acf53584b6c0068605d118c2c0e97916aae`.
- Deployment trigger revision: `83d94aff19ead3209381320881776a2ee01632a5`.
- Both revisions point to source tree
  `c81fe249fd465ddcdda1f473b67e864f88716bed`; the trigger commit is an empty,
  auditable deployment marker and introduces no source-tree change.
- Main-equivalent CI run: `33521953486`, passed.
- Protected private-staging run: `33521953840`, passed.
- Sanitized workflow artifact: `9806309224`, digest
  `sha256:de091837eec11acca84d1442c6f8f1f50a38ce72469957859ec73af9c4406901`.

## Verified live gates

The protected staging run passed the governed source gate before deployment,
then proved all of the following against the stable HTTPS origin:

- three consecutive health/readiness observations from the exact deployed
  revision before authenticated verification began;
- public health, dependency readiness, OAuth discovery, unauthenticated MCP
  challenge, ingress size bound, and closed mutation-shaped routes;
- PKCE authorization-code exchange, replay rejection, refresh rotation and
  replay handling, access/grant revocation, expiry, exact redirect allowlist,
  role and tenant isolation, cross-workspace denial, and cleanup of ephemeral
  verification fixtures;
- the exact six approved read-only tools and no write, bid, purchase, score
  mutation, or legal-conclusion capability;
- live gateway and application telemetry shapes without captured credentials,
  tokens, emails, prompts, evidence payloads, provider envelopes, or raw logs;
- governed rollback to the prior Worker version and recovery to the exact
  target revision with MongoDB and intelligence readiness preserved.

## Sanitized receipts

- [`deployment-83d94af.json`](../../products/chatgpt/tax-lien-intelligence/receipts/deployment-83d94af.json)
- [`public-boundary-83d94af.json`](../../products/chatgpt/tax-lien-intelligence/receipts/public-boundary-83d94af.json)
- [`authenticated-boundary-83d94af.json`](../../products/chatgpt/tax-lien-intelligence/receipts/authenticated-boundary-83d94af.json)
- [`log-redaction-83d94af.json`](../../products/chatgpt/tax-lien-intelligence/receipts/log-redaction-83d94af.json)
- [`rollback-recovery-83d94af.json`](../../products/chatgpt/tax-lien-intelligence/receipts/rollback-recovery-83d94af.json)

The receipt set contains only bounded metadata, digests, fixed check names,
counts, timings, revision identifiers, and routing version identifiers. It does
not contain passwords, connection strings, authorization codes, access or
refresh tokens, email identities, workspace identifiers, user data, prompts,
or parcel-level evidence.

## Gates that remain open

1. Run the separately protected, manual-only owner-bootstrap workflow on the
   default branch and archive its sanitized receipt.
2. Complete the real private ChatGPT OAuth journey using that persistent owner
   identity, verify exactly one intended owner workspace and the six read-only
   tools, then archive the connection receipt.
3. Obtain explicit rights, provenance, as-of, retention, minimization, and
   no-training approval for the market-relevant Maricopa pilot dataset. Add and
   review a separate protected owner-operated ingestion lane before executing
   the required real-data cases. The gateway and MCP surface remain read-only.
4. Do not advance to the real-user or public-release nodes until their declared
   acceptance and evidence gates pass.

## Non-claims

This evidence does not claim a completed real ChatGPT connection, a real-user
pilot, approved real-data ingestion, calibrated prediction, legal advice,
autonomous underwriting, bidding, purchasing, or public release readiness.
