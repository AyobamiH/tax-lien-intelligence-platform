# ChatGPT Product Priority Plan

## Decision

The ChatGPT product is priority one. Work-in-progress is limited to one graph
node, and the only active sequence is:

1. lock the product definition and release boundary;
2. connect a private staging product;
3. validate it with real target users;
4. approve and release the public product.

Lawful data acquisition, trained models, broad county expansion, unrelated web
application features, billing, and marketing are deferred. They resume only
when observed pilot evidence identifies one of them as the highest-impact
blocker, or after the public release node is complete.

## Primary User

The first user is a solo tax-lien investor or a small investment team analyst
who already has a lawful sale list or workspace dataset and needs to review it
without losing the evidence trail.

The product is not initially for county governments, institutional portfolio
automation, the general public, autonomous bidders, or users seeking legal,
tax, or financial advice.

## First Three Jobs

| Job | User outcome | Existing product capability |
| --- | --- | --- |
| Triage a sale list | Find records that deserve manual attention and see why | Dataset and candidate discovery with cited facts, fixed-rule inferences, versioned engine state, and unknowns |
| Perform diligence | Inspect one candidate, identify missing evidence, and compare a user-selected set without an invented ranking | Candidate evidence and bounded comparison tools |
| Prepare a decision record | Produce a concise evidence-backed brief that a human can review outside the chat | Privacy-reduced decision brief tool and links into the system of record |

Dataset upload, membership administration, and any state-changing workflow stay
in the existing authenticated application. ChatGPT links users to that surface
when an upload or mutation is required; it does not receive a hidden write
path.

## Six-Tool Journey

| Journey step | Approved tool | Purpose |
| --- | --- | --- |
| Enter the authorized workspace | `list_workspaces` | Discover only workspaces available to the authenticated user |
| Choose source data | `list_datasets` | Find the user's available datasets without exposing another tenant |
| Triage | `list_dataset_candidates` | Review a bounded page of candidates and visible evidence state |
| Diligence | `get_candidate_evidence` | Separate cited facts, fixed-rule inferences, versioned engine output, and unknowns |
| Compare | `compare_candidates` | Compare a user-selected bounded set without inventing a rank or bid |
| Record the decision | `get_decision_brief` | Create a privacy-reduced cited brief for human review |

No seventh tool is planned. A failed pilot case must justify any tool addition.

## Product Promise

“Use ChatGPT to review your authorized tax-lien workspace, understand what the
records support, see what remains unknown, compare candidates, and prepare a
cited decision brief.”

The product does not promise redemption probability, current title condition,
live auction eligibility, legal conclusions, returns, or bid recommendations.
When evidence is missing or out of scope, it says so.

## Architecture Boundary

The current platform remains the engine, tenant authority, evidence store, and
system of record. A separate, thin ChatGPT release product is planned for the
public connector configuration, onboarding, release metadata, evaluation
manifests, and deployment provenance. It must consume the versioned platform
interface and must not copy scoring logic, evidence records, authentication
decisions, or business workflows.

The proposed release-repository name is
`AyobamiH/tax-lien-chatgpt-product`; the name is a plan, not a claim that the
repository already exists. Creation and deployment occur only within their
graph node and permission boundary.

## Single Release Train

### Gate 1 — Product definition

Graph node: `P47-092-chatgpt-product-definition`.

Status: completed at `81f4664` through GitHub Actions run `33251144894`.

- confirm the user, three jobs, promise, exclusions, and onboarding handoff;
- approve the thin release-repository boundary and provenance contract;
- map the existing six tools to the minimum journey;
- define telemetry that records tool and error metadata without sensitive
  payloads;
- define the pilot protocol, release evaluation set, and named decision owners.

Exit evidence: approved product contract, boundary decision, tool/journey map,
evaluation manifest, and exact external prerequisites. No new runtime feature
is added merely because it might be useful.

The planned live evaluation catalog is
[`chatgpt-release-evaluation.json`](chatgpt-release-evaluation.json). Its cases
must run against the real connected staging product; case definitions are not
runtime proof.

### Gate 2 — Private staging connection

Graph node: `P47-093-chatgpt-private-staging`.

- create the thin release product and pin the engine interface provenance;
- deploy the real MCP service to a stable HTTPS staging endpoint;
- implement and verify the approved OAuth lifecycle;
- connect the product privately in ChatGPT;
- verify roles, revocation, tenant isolation, health, rate limits, redaction,
  support, incident ownership, and rollback;
- complete the triage-to-brief journey against the real staging system.

Exit evidence: a private connected ChatGPT product, real staging receipts,
security and tenancy results, and a tested rollback. A local response or mock
connector does not satisfy this gate.

### Gate 3 — Real-user pilot

Graph node: `P47-094-chatgpt-real-user-pilot`.

- onboard at least five distinct target users;
- observe at least ten real tasks using their own authorized data;
- run at least thirty scripted direct, indirect, invalid, cross-tenant,
  prompt-injection, and out-of-scope scenarios;
- require all critical authorization and tenant-isolation cases to pass;
- require zero uncited numeric, legal, bid, or purchase conclusions;
- target at least 80% independent completion of the three core jobs;
- classify every failure and produce keep, change, stop, and defer decisions.

Exit evidence: real-user results, reproducible eval output, a failure taxonomy,
privacy/support review, and a go/no-go decision. Test fixtures can verify code
but do not count as pilot users or product-value evidence.

### Gate 4 — Public release

Graph node: `P47-095-chatgpt-public-release`.

- promote the verified connection to production;
- complete public listing, privacy, retention, deletion, support, and incident
  materials;
- rerun the full authorization, grounding, safety, reliability, load,
  observability, and rollback suite;
- ensure every public claim matches verified capability;
- release inside a monitored window with a named owner and rollback trigger.

Exit evidence: public connection receipt, approved listing and policy material,
full release evaluation, monitored launch record, and post-launch review.

## Decision Rules That Prevent Drift

- `docs/engine/work-graph.json` is authoritative for the current node.
- At most one node may be `ready` or `in_progress` during this release train;
  the named next node may instead be truthfully `blocked`.
- An agent must not select a deferred data, model, county, web-app, marketing,
  or billing task.
- A proposed addition must name the failed pilot case it resolves. Without that
  evidence, it stays deferred.
- Every work unit updates source, tests, product/architecture docs, graph,
  changelog, and `WORK_LEDGER.md` together, then passes its gates before commit
  and push.
- Production deployment, publication, credentials, paid services, and
  legal/privacy approvals remain explicit permission boundaries.

## Ownership And Required Decisions

| Decision | Accountable owner | Required before |
| --- | --- | --- |
| User promise, pilot cohort, and release go/no-go | Repository operator/product owner | Pilot start and public release |
| Tool contract and engine compatibility | Platform engine owner | Every staging or production promotion |
| Release repository, deployment, OAuth, monitoring, and rollback | ChatGPT release engineer with operator authorization | Private staging |
| Property-evidence privacy, retention, deletion, and consent | Assigned privacy/security approver | Real-user data reaches staging |
| User support and incident response | Named product support owner | Pilot start |

`P47-093` must remain blocked if an accountable person, approved target, or
required authority is absent. Agents may prepare code and documentation inside
an authorized node, but they cannot invent approval.

## Telemetry Boundary

Allowed telemetry is limited to request ID, tool name, success/error class,
duration, bounded response size, interface/engine version, rate-limit event,
and redaction outcome. Logs must not capture prompts, tool arguments, JWTs,
emails, workspace member data, source rows, decision prose, or property
evidence payloads.

## Current OpenAI Product References

- [Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)
- [Authentication](https://developers.openai.com/plugins/build/auth)
- [Connect from ChatGPT](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [Submit for public release](https://developers.openai.com/plugins/deploy/submission)

## Immediate Next Node

`P47-093-chatgpt-private-staging` is in progress. The operator authorized
implementation and private deployment inside the connected GitHub project.
The exact-revision deployment, live public and authenticated boundaries,
redacted telemetry, governed rollback/recovery, least-privilege Atlas role, and
persistent owner bootstrap are complete. The recovered protected real-data
branch had one focused camel-case audit-count failure after all general gates
passed; its repaired source adds strict minimization, idempotency, worker-secret
isolation, exact-job verification, and disposable-Mongo integration coverage.
Pull request #9 now has green exact-head push and pull-request checks. The
remaining gates are authorized human review and merge, a sanitized real ChatGPT
connection receipt, an owner-authorized Maricopa dataset with explicit rights
and handling attestations, and the connected real-data evaluation. No deferred
node becomes runnable while this product gate is active.
