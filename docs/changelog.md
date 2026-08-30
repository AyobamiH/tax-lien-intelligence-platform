# Changelog

## Unreleased

- Passed the exact-head live Cloudflare log-redaction gate in workflow
  `33341199247` at `2c7862e74dc80aaaba6677173293d06801ac2546`. The real stable staging origin passed 12
  public and 12 authenticated boundary checks; the verifier observed three
  payload-free gateway events and one payload-free application event with no
  marker, credential, or secret leakage. Sanitized receipts and deployment
  provenance are pinned in the ChatGPT product package.

- Accounted for Cloudflare's `$cf` container-log enrichment after run
  `33340916921` proved the application event otherwise has the exact expected
  schema. The verifier validates and excludes the provider envelope without
  storing it.

- Added key-name-only diagnostics for persisted application log-shape drift
  after run `33340616895` proved the existing Cloudflare token can query
  Workers Observability and locate the real container event. Values and raw
  events remain suppressed.

- Split the live redaction proof across Cloudflare's actual telemetry
  surfaces after run `33340248905`: Worker real-time tail verifies gateway
  events, while the Workers Observability query API verifies persisted
  container application events and marker absence. Raw events are not stored.

- Replaced the live-tail line parser with a bounded streaming JSON-object
  parser after run `33339888358` proved current Wrangler emits pretty,
  multi-line JSON. Failure diagnostics now expose only aggregate event counts.

- Corrected the live Wrangler tail sampling fraction to `0.99` after
  sanitized exact-head diagnostics classified run `33339651921` as
  `argument_rejected`; no Cloudflare permission change is required.

- Added a sanitized, ephemeral Wrangler debug-log fallback after exact-head
  run `33339301424` passed all 24 live application cases but the tail process
  still returned only `exit_code_1`. Raw provider output is never printed or
  archived and the temporary file is deleted before exit.

- Included structured, non-log Wrangler JSON objects in the bounded live-tail
  startup classifier after run `33339042402` again returned only
  `exit_code_1`. Raw provider diagnostics remain suppressed.

- Extended the private-staging tail startup classifier to cover Wrangler's
  non-JSON stdout diagnostics after run `33338765853` returned only
  `exit_code_1`. The raw provider output remains suppressed and no live
  redaction receipt is claimed.

- Recorded failed-closed log-tail run `33338469468`: deployment and all 24
  public/authenticated live cases passed at `a17afd5`, but Wrangler tail
  exited before the redaction probe. Added bounded startup-failure
  classification; no raw diagnostics or false redaction receipt are stored.

- Added an exact-head Cloudflare log-redaction gate for private staging. It
  verifies the deployed Worker and API custom logs against unique payload and
  credential markers, stores only a sanitized pass receipt, and disables
  persistent provider invocation logs while retaining unsampled payload-free
  operational events. Live verification remains pending.

- Passed the real authenticated staging boundary at exact revision `60d3cca`:
  12 public checks, 12 OAuth/role/tenant/tool checks, fixture cleanup, receipt
  archival, and a bounded 100-request rate-limit probe. The product package now
  pins the exact deployment, public-boundary, and authenticated-boundary
  receipts without credentials, codes, tokens, emails, fixture identifiers, or
  evidence payloads.
- Corrected the live denied-role case after the real service proved that users
  with no membership receive a personal owner workspace. The test now requires
  isolation to an explicit personal fixture workspace and denial of the target
  workspace, with ownership-aware cleanup for auto-created fixture workspaces.
- Repaired the authenticated live verifier's failure reporter after run
  `33337074423` exposed an initialization-order `ReferenceError`. The exact
  OAuth, tenancy, tool, receipt, and fixture-cleanup assertions are unchanged;
  the failed run produced no authenticated receipt.
- Added a real post-deploy authenticated OAuth/MCP verifier. Its unique
  ephemeral test fixture covers PKCE, code replay, refresh rotation/replay,
  revocation, expiry, owner/admin/member/denied roles, cross-workspace denial,
  and the exact six read-only tools, then removes the fixture and archives only
  sanitized case-level evidence.
- Deployed the real private-staging topology at exact revision `fec745e` in
  successful GitHub Actions run `33335437008`. The stable workers.dev origin
  reports Mongo connected and the Python intelligence service ready.
- Added and ran a live public-boundary verifier covering TLS/HSTS health,
  readiness, exact OAuth discovery, fail-closed MCP authentication, the ingress
  body bound, and closed mutation/registration routes. A sanitized receipt is
  stored with the ChatGPT product; no credentials, tokens, users, or evidence
  payloads are stored.
- Disabled Worker preview URLs and made every future staging deployment verify
  the derived exact origin and archive a sanitized receipt before its workflow
  can pass.
- Redeployed the governed boundary at exact revision `aca4081`. Workflow run
  `33336257365` attempt 2 passed every source and live gate, archived the exact
  receipt, and a bounded 100-request OAuth probe verified `429` throttling while
  health remained available.
- Added a bounded Cloudflare private-staging deployment boundary: one Worker,
  one supervised Node/Python Container instance, external managed MongoDB,
  exact-origin and route allowlists, ingress body limits, edge rate-limit
  bindings, payload-free logs, dependency readiness, SIGTERM handling,
  secret-name preflight, a manual deployment workflow, and documented rollback.
- The staging Worker exposes only health/readiness, OAuth discovery/lifecycle,
  and `/mcp`; ordinary auth registration, uploads, dataset/scoring mutations,
  bids, purchases, and every unlisted route remain unavailable at ingress.
- Added `npm run validate:chatgpt-staging` and focused readiness, redaction, and
  gateway-policy tests. These are source checks, not a live endpoint, paid-plan,
  Mongo, ChatGPT connection, load, log, or rollback receipt.
- Published the private-staging source checkpoint at `eed50b6`, opened pull
  request #2, and passed exact-head GitHub Actions run `33329355584` including
  the real intelligence and OAuth Mongo smokes. Live connection fields and
  receipts remain deliberately null.
- Added a feature-branch-safe deployment bootstrap: ordinary pushes skip the
  deploy job, the exact `[deploy-private-staging]` commit marker enables it,
  and six GitHub environment secret references derive and install the five
  required Worker bindings over stdin without logging their values.
- Provisioned the live `$0` Atlas staging project and cluster, confirmed the
  cluster-scoped SCRAM application user, enabled the user-approved dynamic
  egress access-list rule, and confirmed all six required GitHub environment
  secret names without reading or storing their values. This is prerequisite
  evidence, not a deployment or ChatGPT connection receipt.
- Repaired the first live deployment failure after exact-head run `33334912896`
  passed source gates and secret synchronization but failed closed on
  Wrangler's obsolete `secret list --json` option. Preflight now uses the
  supported `--format=json` flag, enforced by the source validator.
- Repaired the next live packaging failure from run `33335163254`: the
  Node-only image stage no longer invokes the Python portion of the root build.
  Node workspaces build in the Node stage and Python source validation runs in
  the final Python stage, with a validator guard for the runtime boundary.
- Reconciled repository truth after pull request #1 merged at `main@50dae44`
  and GitHub Actions run `33309185096` passed its complete quality-gates job.
- Opened pull request #1 to integrate the verified Phase 47 engine, evidence,
  MCP, and OAuth source checkpoints into `main`. Exact feature head `a9272bc`
  passed GitHub Actions run `33253657970`; the PR does not represent a deployed
  or connected private ChatGPT staging product.
- Added a real ChatGPT OAuth 2.1 boundary with protected-resource and
  authorization-server discovery, explicit consent/denial, exact client,
  redirect, resource, and scope checks, mandatory PKCE S256, short-lived MCP
  tokens, rotating hashed refresh tokens, replay-family revocation, persisted
  access-token revocation, and fail-closed user checks.
- Made OAuth-enabled `/mcp` reject application login JWTs and added focused
  discovery, redirect, consent, PKCE, one-time code, OAuth-only MCP, refresh
  rotation/replay, and revocation tests.
- Added the source-only ChatGPT release package under `products/chatgpt`, a
  pinned provenance manifest, a CI validator that forbids fabricated endpoints
  or receipts, the private staging runbook, and the OAuth threat model.
- Moved `P47-093-chatgpt-private-staging` to in progress. Source implementation
  is active; real deployment, ChatGPT connection, live verification, and named
  privacy/support/incident ownership remain explicit blockers.
- Made the ChatGPT product priority one and replaced competing ready work with
  one WIP-limited sequence: product definition, private staging connection,
  real-user pilot, and public release.
- Added a machine-enforced `executionFocus` to the work graph. Exactly one node
  may be ready or in progress; data acquisition, model training, and model
  evaluation are deferred until pilot evidence identifies them as the
  highest-impact blocker or public release is complete.
- Added the primary user, triage/diligence/decision-brief jobs, release gates,
  real-user pilot thresholds, no-drift rules, and the thin ChatGPT release
  product architecture decision.
- Added an exact six-tool journey, privacy-preserving telemetry boundary,
  decision-owner map, and 30-case live release evaluation manifest covering
  core tasks, grounding, invalid inputs, authorization, prompt injection, and
  out-of-scope requests.
- Closed the ChatGPT product-definition gate after GitHub Actions verified the
  full repository, real intelligence service, and real Mongo persistence path.
  Private staging remains the named next node and is explicitly blocked on
  deployment, OAuth, privacy, consent, support, and incident ownership inputs.
- Added an authenticated stateless MCP endpoint with six read-only ChatGPT
  evidence tools for workspace discovery, dataset review, bounded candidate
  retrieval, candidate evidence, no-ranking comparison, and privacy-reduced
  decision briefs.
- Enforced workspace membership inside every tool before tenant lookup, with no
  caller-supplied tenant id and no write, approval, bid, purchase, or external
  action tool.
- Added a versioned structured output envelope that separates cited stored
  values, legacy fixed-rule heuristics, versioned engine output, and explicit
  unknowns. User-upload evidence remains qualified as unverified.
- Added MCP authentication, annotations, input-bound, tenant-resolution,
  evidence-grounding, no-ranking, and prompt-like source-data tests plus an
  interface contract and privacy/safety review.
- Retained the application bearer JWT for internal validation only. Public
  ChatGPT use remains blocked on stable HTTPS deployment, production
  observability, load tests, and live OAuth/authorization validation.
- Added a machine-readable Maricopa source inventory and CI validator that
  blocks production approval without verified authority, schema, cadence,
  observation time, commercial-use terms, and provenance, and blocks training
  use without dated outcomes and censoring fields.
- Sampled the real 2026-08-17 Assessor Secured Master archive, its 39-field
  schema, twice-monthly declared cadence, current-tax-year limit, personal-data
  fields, and missing certificate redemption outcomes.
- Traced the official county Lien and Delinquent Parcels application to its
  ArcGIS experience, web map, feature service, and two relevant layer schemas.
  Recorded its written-authorization requirement and commercial-use restriction
  as a production blocker.
- Added a blocked redemption training dataset card and split lawful data
  acquisition into its own graph node. The read-only ChatGPT evidence interface
  can proceed against stored evidence and abstention without waiting for a
  trained model.
- Integrated the tenant-aware scoring worker with the internal Python service
  through a bounded TypeScript client that validates contract shape, request
  identity, evidence version, and evidence digest before persistence.
- Added `user_upload` provenance to contract `1.1.0`, preserving the source as
  an unverified upload rather than presenting it as an official county record.
  All current uploads remain outside the exact Maricopa rule-pack scope because
  header patterns and user-provided labels do not prove issuing authority.
- Persisted complete versioned results and explicit `not_configured` or failed
  envelopes on scored records. Current failures replace prior results instead
  of silently reusing stale intelligence.
- Added `legacyScoring` response metadata and changed visible redemption labels
  to fixed-rule heuristic signals. The React record detail now displays engine
  status, versions, applicability, signals, findings, missing evidence, and
  explicit abstention states.
- Added real-process production-client tests, candidate-evidence tests,
  Mongo-model consistency tests, browser-like intelligence-state tests, and a
  CI MongoDB smoke that proves result round-trip validation and stale-result
  removal.
- Added a dependency-free Python 3.12 intelligence service with authenticated
  `POST /v1/evaluate`, public health/version truth, strict request limits,
  structured safe errors, graceful shutdown, and a non-root container
  boundary.
- Added independent Python candidate/result validators and deterministic rule
  evaluation with no model or provider fallback. The service rejects invalid
  evidence and validates its own result before serialization.
- Hardened cross-language evidence hashing with tagged UTF-8 and IEEE-754
  canonical encoding, then added a real-process loopback test that compares the
  complete Python HTTP result with the TypeScript rule evaluator for fractional
  numeric evidence.
- Added 10 Python unit tests, 7 authenticated service-process tests, Python
  compile/test scripts, a dedicated service smoke, and Python 3.12 CI setup.
  Error connections close explicitly so unread rejected bodies cannot corrupt
  a later keep-alive request.
- Added `@tax-lien/jurisdiction-rules` with an exact-scope, immutable Maricopa
  County registry entry, deterministic evaluation, canonical evidence digest,
  and source-citation resolution.
- Encoded a dated Arizona statutory baseline from current Legislature sources
  while explicitly leaving Maricopa auction registration, schedule, payment,
  and platform mechanics unverified. Statutory context, county operations, and
  internal underwriting policy are separate rule categories.
- Added evidence-backed internal exclusions for known value coverage below one
  and observed lack of road access. Unsupported jurisdictions return
  `out_of_scope`, missing core evidence returns `insufficient_evidence`, and
  redemption probability remains unavailable.
- Added the versioned `@tax-lien/engine-contract` package with
  `CandidateEvidenceV1`, `EngineResultV1`, strict runtime validation, JSON
  Schemas, and a machine-readable version manifest.
- Enforced provenance and truthful abstention at the contract boundary:
  observed and derived evidence requires cited sources, non-available signals
  cannot carry values, and an available redemption probability requires a
  versioned model artifact, training-dataset version, digest, and evaluation
  report reference.
- Documented the existing scoring API's `redemptionProbability` as a legacy
  fixed-rule heuristic and reserved `redemption_probability` in the new engine
  contract for evaluated model output. Compatibility integration remains a
  separate graph node.
- Established Phase 47 intelligence-engine governance with a machine-readable
  dependency graph, deterministic graph validator, CI gate, agent handoff
  protocol, current-status ledger, architecture decision, and documented
  open-source component boundaries.
- Made no-mock intelligence and truthful abstention explicit acceptance rules:
  unsupported evidence must return `insufficient_evidence` or `out_of_scope`,
  and model probabilities remain unavailable until trained artifacts and
  temporal calibration evidence exist.
- Stabilized latest-job selection by adding a deterministic identifier
  tie-break when multiple jobs for the same target share millisecond-level
  queue and creation timestamps. This prevents maintenance policy evaluation
  from reading an older scoring job instead of the most recent policy refresh.
- Added Phase 46 browser-like follow-up lifecycle smoke proof. The new
  `npm run smoke:follow-ups:browser` command mounts the authenticated React app
  shell in jsdom with synthetic local data, renders portfolio follow-up
  due-state, drives update, complete, and snooze controls, verifies auth and
  workspace headers on follow-up API calls, and writes bounded JSON evidence to
  `/tmp/tax-lien-follow-up-browser-smoke.json` by default.
- Extended `npm run smoke:browser` to include the follow-up lifecycle smoke
  alongside the existing app-shell smoke. This remains browser-like runtime
  proof, not screenshot, deployed, production, or browser-driver evidence.
- Implemented Phase 45 follow-up completion, snooze, and follow-through
  control as a bounded operational reminder layer, not a task or calendar
  system.
- Added explicit follow-up completion and snooze APIs, persisted completion and
  snooze metadata, due-state visibility for completed follow-ups, and activity
  events for meaningful completion/snooze transitions.
- Updated reminder scans and queues so completed follow-ups no longer generate
  due alerts, snoozed follow-ups reset reminder state and defer alert
  generation to the new due date, and alert metadata remains limited to actual
  due/overdue alert states.
- Added frontend controls for completing and snoozing follow-ups on supported
  entity surfaces and the My Work follow-up queue.
- Added integration coverage for completion, queue/reminder suppression,
  invalid snooze date rejection, snooze metadata, and reminder reset after
  reschedule.
- Extended `npm run smoke:mongo` to cover Phase 45 completion and
  snooze/reschedule behavior against the built API and real Mongo store path,
  including completed-record reminder suppression, snooze reminder reset, and
  a second bounded due reminder after the snoozed date.
- Fixed Mongo follow-up previous-record lookup so reschedule/snooze metadata is
  derived from the workspace/entity target key rather than the full mutation
  input.
- Added `npm run smoke:mongo` to recover the abandoned pre-Phase-45
  verification gap: a real Mongo-backed follow-up workflow smoke for Phase 44.
  The smoke uses a temporary database, exercises authenticated follow-up set,
  queue, scheduler reminder generation, duplicate suppression, alert
  persistence, and clear behavior, then drops only the temporary smoke database.

## 2026-06-16

- Implemented Phase 44 follow-up dates, reminders, and review cadence as a
  bounded operational reminder layer for comparison, watchlist, and portfolio
  records.
- Added authenticated follow-up state, set/update, clear, and personal queue
  APIs with selected-workspace membership, target access revalidation,
  invalid-date rejection, one-active-follow-up-per-target behavior, and
  stale-target omission.
- Added due-state calculation for upcoming, due, overdue, cleared, and no
  follow-up states, plus compact frontend controls on supported record detail
  surfaces and an actionable follow-up queue in My Work.
- Added scheduler-driven `follow_up_due` alert generation through existing
  alert, notification preference, delivery, and digest infrastructure, with
  bounded duplicate suppression by due-state transition.
- Added workspace activity for follow-up set/clear events without copying note
  text into activity metadata.
- Added integration and frontend contract tests for follow-up creation/update,
  invalid dates, clear behavior, cross-workspace rejection, My Work
  aggregation, reminder generation, and reminder noise suppression.
- Kept full task management, recurring reminders, calendar integrations,
  SLA/escalation suites, workforce planning, auction execution, and AI
  scheduling assistance out of scope.
- Implemented Phase 43 outcome review and retrospective insights as a bounded
  operational learning workflow.
- Added authenticated `GET /outcome-review` with selected-workspace membership,
  final outcome counts, resolved/unresolved comparison mix, recent resolution
  windows, status/entity grouping, and grounded retrospective signals.
- Filtered outcome review aggregation through current comparison access so
  stale/deleted targets and cross-workspace records are not surfaced.
- Added a compact `#/outcome-review` frontend surface with window selection,
  summary metrics, outcome mix, recent resolutions, review signals, and
  navigation into existing decision briefs.
- Added integration and frontend API contract tests for summary retrieval,
  status counts, recent-window behavior, empty states, stale target omission,
  invalid filters, and workspace isolation.
- Refreshed the lockfile to `multer@2.2.0` after a new high-severity upload
  DoS advisory affected `multer@2.1.1`; `npm audit` is clean again.
- Kept BI/report builders, financial performance modeling, predictive
  analytics, AI insight generation, legal/compliance reporting, exports, and
  auction execution out of scope.
- Implemented Phase 42 final decision outcomes for comparison items as a
  practical internal resolution workflow.
- Added workspace-scoped decision outcome persistence with one current final
  outcome per comparison item, statuses for approved/declined/deferred/archived,
  resolver attribution, required rationale, and resolved timestamps.
- Added authenticated outcome state and resolve APIs with member read access,
  owner/admin mutation, target access checks, invalid-state validation,
  idempotent same-outcome retries, and cross-workspace rejection.
- Kept approved outcomes coherent with governance by checking current
  assignment/checklist policy prerequisites and rejecting approved resolution
  while approvals are still pending.
- Added final outcome visibility and owner/admin controls to comparison detail
  and decision brief surfaces, with active-vs-resolved distinction and safe
  note rendering.
- Added one meaningful workspace activity event for changed final outcomes
  without copying resolution rationale into activity metadata.
- Added integration and frontend API contract tests for outcome creation,
  updates, invalid payloads, governance blockers, role restrictions,
  cross-workspace access, and resolver attribution.
- Kept reopen workflows, legal/compliance record systems, signatures,
  settlement tracking, reminders, external portals, auction execution, and AI
  outcome recommendations out of scope.
- Implemented Phase 41 decision briefs for comparison items as a bounded
  evidence-pack workflow.
- Added authenticated `GET /decision-briefs/comparison_item/:entityId`, which
  aggregates target summary, score/risk signals, source dataset readiness,
  assignment, checklist readiness, approval status, workspace policy
  requirements, recent decision history, latest discussion, and portable
  plain-text summary.
- Added tenant-safe aggregation that reuses existing comparison, dataset,
  assignment, checklist, approval, comment, and policy access boundaries and
  avoids returning evidence for inaccessible cross-workspace targets.
- Added a comparison-detail entry point and `#/decision-briefs/...` frontend
  surface with readiness visibility, copy/print controls, compact evidence
  sections, and clear missing-dataset behavior.
- Added integration and frontend API contract tests for brief retrieval,
  stale dataset compatibility, unsupported target rejection, workspace
  isolation, and selected-workspace request headers.
- Kept PDFs, public sharing links, arbitrary report builders, legal evidence
  custody, e-signatures, AI-written summaries, and auction execution out of
  scope.

## 2026-06-15

- Implemented Phase 40 workspace policy enforcement with three fixed,
  default-off rules for comparison assignment, required checklist readiness,
  and approval before portfolio handoff.
- Added authenticated workspace policy retrieval/update APIs, owner/admin
  management, member visibility, structured unmet-requirement responses, and
  cross-workspace isolation.
- Enforced enabled rules on comparison-to-watchlist, direct
  comparison-to-portfolio, approval request, and approval resolution paths,
  including readiness rechecks before approved execution.
- Added a compact workspace policy management surface and clear blocked-action
  messages that state both what is missing and how to resolve it.
- Added integration tests for default compatibility, role restrictions,
  workspace isolation, blocked and allowed actions, approval satisfaction, and
  stale checklist state.
- Kept arbitrary rules, expression languages, per-user exceptions, policy
  notifications, compliance packs, and general workflow building out of scope.
- Implemented Phase 39 workspace-scoped review checklist templates and
  record-level completion for comparison, watchlist, and portfolio items.
- Added owner/admin template management, stable item ids, template versioning,
  lazy record snapshots, completion attribution, required/optional items, and
  derived review-readiness states.
- Added compact checklist controls to supported detail surfaces, workspace
  template management, and a nonblocking readiness signal around comparison
  handoff and approval.
- Added tests for role restrictions, completion/reopening, required readiness,
  optional items, template revision, stale targets, and workspace isolation.
- Refreshed transitive lockfile resolutions for newly disclosed `form-data` and
  Babel advisories; `npm audit` remains clean.
- Kept compliance evidence storage, attachments, e-signatures, workflow
  builders, hard action gates, and per-toggle notifications out of scope.

## 2026-06-14

- Implemented Phase 38 workspace-scoped follow subscriptions for datasets,
  comparison items, watchlist items, and portfolio items.
- Added authenticated follow, unfollow, state, follower-count, and personal
  followed-item list APIs with duplicate-safe persistence, target-access
  validation, stale-target filtering, and cross-workspace rejection.
- Added follow controls to all supported record detail surfaces and an
  informational Following queue in My Work. Following does not assign
  responsibility or increase the actionable-work count.
- Added bounded `followed_item_changed` alerts for assignment changes,
  portfolio status changes, and approval resolution. Actors and newly assigned
  recipients are excluded where they already have direct context, and existing
  personal notification preferences still govern in-app versus delivery-ready
  behavior.
- Added integration and frontend API contract tests for duplicate follows,
  unfollow, stale targets, workspace isolation, follower alerts, preference
  handling, and My Work aggregation.
- Kept social following, public feeds, reactions, mentions, recommendations,
  presence, and notification-on-every-change behavior out of scope.
- Implemented Phase 37 member-focused my-work aggregation over existing
  assignments, reviewable approvals, and unread discussion attention.
- Added authenticated `GET /my-work` with selected-workspace membership,
  server-derived reviewer eligibility, stale-target filtering, grouped counts,
  bounded queue previews, and explicit empty states.
- Added `#/my-work` as the signed-in and workspace-switch home with compact
  actionable queues and navigation into existing record and approval surfaces.
- Added integration and frontend contract tests for aggregation, empty states,
  requester/reviewer differences, stale targets, safe discussion payloads, and
  cross-workspace rejection.
- Kept task objects, due dates, SLAs, boards, workload analytics, workspace-wide
  activity, and AI prioritization out of scope.

## 2026-06-13

- Implemented Phase 36 approval requests and review checkpoints for
  comparison-to-portfolio handoff.
- Added a workspace-scoped approval model, pending/approved/rejected/cancelled
  lifecycle, bounded requester/reviewer notes, duplicate-pending protection,
  short-lived atomic reviewer claims, stale-target checks, and recorded
  portfolio outcomes.
- Added active-member request access, owner/admin review authority,
  self-review prevention, requester-only cancellation, cross-workspace
  non-disclosure, and an owner-only direct-handoff compatibility path.
- Added comparison approval status/request controls, a focused `#/approvals`
  queue, approve/reject/cancel actions, reviewer rationale, and resolved outcome
  visibility.
- Added bounded approval workspace activity without copying note text, plus
  integration and frontend contract tests for valid, unauthorized, stale,
  repeated, and cross-workspace paths.
- Kept multi-step chains, arbitrary workflow builders, SLA/escalation,
  e-signatures, compliance approval systems, approval notifications, auction
  execution, and AI routing out of scope.
- Implemented Phase 35 role-aware workspace administration and permission
  hardening with explicit owner/admin/member action boundaries.
- Added safe membership deactivation and reactivation, owner protection,
  admin target-role restrictions, cross-workspace non-disclosure, and immediate
  access revocation for inactive memberships.
- Added owner-only role changes, owner/admin member-removal controls, clear
  protected/restricted frontend states, confirmation and success/error
  feedback, and member-removal workspace activity.
- Restricted responsibility assignment changes to owners/admins while keeping
  assignment visibility and personal queues available to active members.
- Added integration and frontend contract tests for role differences,
  self-escalation prevention, last-owner protection, removal/reactivation,
  cross-workspace rejection, and permission-aware rendering.
- Kept custom roles, SSO/SAML, SCIM, billing administration, approval
  workflows, and enterprise policy tooling out of scope.
- Implemented Phase 34 dependency vulnerability triage and supply-chain
  hardening.
- Traced the two npm high-severity entries to `vite@7.3.3` and vulnerable
  `esbuild` versions `0.27.7`/`0.28.0` used by frontend and TypeScript build
  tooling, not deployed API or browser runtime code.
- Upgraded to `vite@8.0.16`, refreshed esbuild to fixed `0.28.1`, aligned the
  Node engine range, and verified the Vite 8 production bundle without
  compatibility overrides.
- Reclassified React/Vite/PostCSS/Tailwind compiler packages as development
  dependencies and added a high-severity `npm audit` gate to CI and pre-push.
- Full and production-only npm audits now report zero vulnerabilities; no known
  npm advisory remains unresolved.
- Implemented Phase 33 workspace assignments with one current workspace-owned
  assignee for datasets, comparison items, watchlist items, and portfolio
  items.
- Added authenticated get/assign/reassign/clear APIs, active-membership and
  target-access validation, no-op handling, cross-workspace rejection, and a
  bounded assigned-to-me queue that filters stale targets.
- Added responsibility activity for meaningful assignment changes and
  preference-aware `workspace_item_assigned` alerts for new assignees, with
  self-notification exclusion and no alert on clear.
- Added assignment controls to all supported detail surfaces and a dedicated
  `#/assignments` personal work queue.
- Added integration and frontend contract tests while keeping due dates,
  reminders, task status, boards, approvals, automatic routing, and auction
  execution out of scope.

## 2026-06-12

- Implemented Phase 32 comment notification workflow with per-member,
  workspace-scoped discussion attention, unread counts, explicit read clearing,
  and peer-only alert generation.
- Added one-alert-per-unread-cycle noise control: later comments increment the
  unread count without repeatedly alerting the same member, and authors never
  notify themselves.
- Added `workspace_comment_added` to personal notification preferences and the
  existing email/digest delivery pipeline. The default remains enabled,
  in-app-only, and comment body text is excluded from alerts and delivery
  payloads.
- Added unread indicators and read controls to supported discussion surfaces,
  plus workspace-aware alert navigation to datasets, comparison, watchlist, and
  portfolio.
- Added tests for unread cycles, self-notification exclusion, cross-workspace
  rejection, preference/digest integration, API behavior, and frontend
  navigation/presentation helpers.
- Implemented Phase 31 workspace comments with a workspace-owned comment model,
  verified actor attribution, bounded plain-text bodies, and entity access
  checks for datasets, comparison items, watchlist items, and portfolio items.
- Added authenticated list/create/delete APIs. Every active workspace member
  may discuss an accessible record; deletion is limited to the original author
  and is a hard delete in this phase.
- Added compact discussion sections to all four supported frontend detail
  surfaces with loading, empty, error, create, timestamp, attribution, and
  author-delete states.
- Added tests for supported targets, member creation, stale and malformed
  references, workspace isolation, author-only deletion, content limits,
  selected-workspace API headers, and escaped plain-text rendering.
- Kept comments out of the workspace activity feed to avoid turning operational
  activity into a chat transcript. Realtime delivery, rich text, mentions,
  attachments, reactions, tasks, approvals, and comment editing remain out of
  scope.

## 2026-06-11

- Implemented Phase 30 workspace activity with a workspace-scoped activity
  model, safe actor email snapshots, bounded metadata, server-derived summaries,
  category filtering, and membership-protected retrieval.
- Added focused events for dataset upload, score/refresh requests, comparison
  decision changes and successful handoffs, portfolio status changes, member
  additions, and member role changes. No-op refreshes, duplicate handoffs, note
  text, raw errors, and read interactions are not recorded.
- Added a calm `#/activity` frontend surface with actor, summary, timestamp,
  category tabs, loading/empty/error states, and navigation to affected
  datasets, comparison, watchlist, portfolio, or workspace management.
- Added tests for all supported event types, actor attribution, empty feeds,
  category filtering, cross-workspace rejection, API headers, safe summaries,
  and frontend navigation helpers.
- Kept item-level comparison history intact and kept chat, comments, mentions,
  tasks, approvals, realtime collaboration, and compliance-grade audit logging
  out of scope.
- Implemented Phase 29 workspace/team-access foundation with persistent
  workspace and membership models, minimal owner/admin/member roles, automatic
  personal-workspace bootstrap, and direct membership creation for registered
  users.
- Added `X-Workspace-Id` membership resolution and role-aware access for
  datasets, scoring/jobs, import profiles, watchlist, portfolio, comparison,
  decision history, and handoff while preserving legacy records through the
  workspace owner's compatibility tenant key.
- Added authenticated workspace/member APIs and a lightweight frontend
  workspace surface with context, role, member list, workspace switching,
  member addition, and owner-only role controls.
- Added tests for bootstrap, compatibility, shared reads, member write denial,
  cross-workspace rejection, role assignment, admin restrictions, API headers,
  and frontend role presentation.
- Kept alerts, notification preferences/history, and saved views personal, and
  kept comments, chat, shared editing, tasks, approvals, custom permissions,
  billing, auction execution, and ML/AI collaboration out of scope.

## 2026-06-06

- Implemented Phase 28 digest delivery with tenant-owned digest batches,
  scheduler-backed bounded processing, atomic outbox claims, current-preference
  rechecks, concise grouped product-alert email, duplicate-send protection, and
  coherent sent/suppressed/failed/provider-disabled state transitions.
- Added authenticated `GET /notification-deliveries`, safe owner-scoped history
  projections, and a focused `#/delivery-history` frontend surface for immediate
  email, digest batches, suppressions, failures, loading, empty, and error
  states.
- Added tests for digest grouping, scheduled success, preference suppression,
  duplicate avoidance, provider-disabled and provider-failure behavior, history
  isolation, API client behavior, and frontend presentation helpers.
- Updated architecture, API, README, env, and KB documentation to mark digest
  processing and user-visible delivery history as current product-alert
  workflow while keeping SMS, push, campaigns, realtime messaging,
  collaboration, ML/AI prioritization, and auction execution out of scope.

## 2026-06-01

- Implemented Phase 27 email delivery foundation with a tenant-owned delivery
  outbox model, provider-agnostic email transport boundary, env-driven SMTP
  transport, disabled-by-default provider safety, immediate email handling for
  preference-enabled product alerts, provider-disabled and failure tracking,
  duplicate-send avoidance, digest-ready outbox grouping, frontend notification
  preference copy updates, and tests for success, suppression, disabled config,
  provider failure, duplicate avoidance, digest grouping, owner-safe recipient
  resolution, and email content.
- Updated notification preference, alert, architecture, API, README, env, and
  KB docs to mark email delivery foundation as current while keeping SMS, push,
  marketing messaging, user-facing digest send workers, collaboration, and
  auction execution out of scope.
- Implemented Phase 26 notification preferences with a tenant-owned preference
  model, authenticated get/update API, explicit rules for current scoring alert
  types, frontend notification preference controls, preference-driven
  job-alert suppression, and provider-agnostic delivery classification for
  in-app-only, immediate delivery-ready, and digest-ready alerts.
- Added notification preference API/architecture docs and updated the KB pack
  to mark notification preferences and delivery readiness as current while
  keeping broad email/SMS provider rollout, marketing messaging, realtime push,
  team policies, complex rules engines, ML/AI prioritization, collaboration,
  and auction execution out of scope.
- Implemented Phase 25 saved views with a tenant-owned saved view model,
  authenticated saved-view create/list/apply/update/delete routes, deterministic
  portfolio and comparison criteria validation, built-in attention queues, a
  frontend portfolio saved-view/apply/default flow, and tests for valid
  creation, invalid criteria, ownership-safe apply, queue behavior, API client
  calls, and review helpers.
- Added saved-view API/architecture documentation and updated the KB pack to
  mark saved operational views as current while keeping BI/report builders,
  arbitrary query languages, team/shared views, spreadsheet exports,
  collaboration workflows, ML/AI prioritization, and auction execution out of
  scope.
- Implemented Phase 24 portfolio dashboard with an authenticated
  `GET /portfolio/summary` endpoint, tenant-scoped status distribution,
  recent additions/status changes, conservative needs-attention summaries,
  a focused frontend portfolio dashboard, status filtering, and tests for
  summary behavior, ownership-safe aggregation, API client calls, and review
  helpers.
- Updated portfolio API/architecture documentation and the KB pack to mark the
  portfolio dashboard as current while keeping accounting, return calculators,
  BI/report builders, collaboration dashboards, ML/AI insights, and auction
  execution out of scope.
- Implemented Phase 23 decision handoff with explicit comparison-to-watchlist
  and comparison-to-portfolio actions, duplicate-safe target creation/reuse,
  server-recorded handoff history with target linkage and rationale snapshots,
  focused frontend handoff controls, and tests for tenant-safe transitions,
  stale references, duplicates, and API client behavior.
- Added decision handoff API/architecture documentation and updated the KB pack
  to mark explicit user-driven handoff as current while keeping workflow
  engines, collaboration approvals, task management, auction execution, and
  ML/AI recommendations out of scope.
- Implemented Phase 22 decision history with tenant-owned comparison history
  records, decision/note change capture, authenticated history retrieval,
  selected comparison item history visibility, and tests for owner-scoped
  history, stale item handling, and frontend API/presentation helpers.
- Added decision history API/architecture documentation and updated the KB pack
  to mark lightweight decision history as current while keeping legal-grade
  audit logging, collaboration activity feeds, rich diffs, task management,
  auction execution, and ML/AI decision assistance out of scope.
- Implemented Phase 21 comparison workspace with tenant-owned comparison
  items, source resolution from owned scored/watchlist/portfolio records,
  duplicate-safe adds, explicit review decisions, bounded lightweight notes,
  authenticated comparison APIs, a side-by-side frontend comparison matrix, and
  tests for source ownership, updates, and cross-user isolation.
- Added comparison API and architecture documentation and updated the KB pack to
  mark comparison/decision notes as current while keeping collaboration, audit
  trails, task management, rich text notes, spreadsheet builders, auction
  execution, and ML/AI decision suggestions out of scope.
- Implemented Phase 20 reusable import profiles with tenant-owned profile
  records, save-from-mapping/list/apply APIs, deterministic header-shape
  matching, conservative auto-apply/suggest behavior, profile-derived mapping
  overlays, frontend profile save/apply visibility, and tests for reuse,
  false-positive avoidance, invalid profiles, and cross-user isolation.
- Updated dataset/frontend/API/KB docs to mark reusable import profiles as
  current while keeping full ETL rule builders, ML/AI mapping suggestions,
  global/shared profiles, live sync, collaboration, spreadsheet editing, and
  auction execution out of scope.
- Implemented Phase 19 manual mapping/import repair workflow with dataset-owned
  manual mapping metadata, authenticated mapping context/save endpoints,
  readiness re-evaluation after repairs, scoring-path mapping overlays, a
  focused frontend repair panel, and tests for valid mappings, invalid targets,
  invalid columns, cross-user access, and mapped scoring.
- Updated dataset/frontend/API/KB docs to mark focused manual mapping repair as
  current while keeping full spreadsheet editing, row-by-row mutation, ML/AI
  mapping suggestions, broad county coverage, live sync, collaboration, and
  auction execution out of scope.
- Implemented Phase 18 import validation and scoring-readiness workflow with
  backend-computed dataset readiness summaries, canonical field coverage,
  ready/partial/weak/blocked guidance, frontend readiness badges/panels, and
  tests for strong, partial, weak, and blocked import paths.
- Updated dataset/frontend/API/KB docs to mark import readiness as current while
  keeping manual field mapping, spreadsheet transform tooling, broad county
  adapter coverage, live county sync, ML/AI suggestions, collaboration, and
  auction execution out of scope.
- Implemented Phase 17 browser upload workflow with an authenticated dataset
  upload form, multipart API client integration, upload submitting/success/error
  states, import summary visibility, county-adapter/fallback messaging, and
  tests for upload API behavior and import presentation.
- Updated frontend/dataset/API/KB docs to mark browser upload as current while
  keeping batch upload, live county sync, scraping, ML/AI import
  classification, collaboration, and auction execution out of scope.
- Implemented Phase 16 county-specific import adapter foundation with an
  explicit county adapter interface, a Maricopa-style tax lien CSV adapter,
  safe generic fallback, dataset import summaries, frontend import context
  visibility, and tests for match/fallback/partial mapping/scoring readiness.
- Updated dataset/import/API/architecture/KB docs to mark one county-specific
  import path as current while keeping broad county coverage, live county sync,
  scraping, provider sprawl, ML/AI import classification, collaboration, and
  auction execution out of scope.
- Implemented Phase 15 scheduled maintenance foundation with a
  `dataset_maintenance` job type, stale scored-record scanning, explicit
  manual-only versus policy auto-refresh gating, scheduler-driven maintenance
  task registration, policy-created `requestKind: "policy_refresh"` scoring
  jobs, maintenance status visibility, and duplicate/failure suppression tests.
- Updated job/scoring/worker/API/KB docs to mark scheduled maintenance
  groundwork as current while keeping unlimited autonomous refresh, provider
  sprawl, external scheduler products, ML/AI, delivery channels, collaboration,
  and auction execution out of scope.
- Implemented Phase 14 controlled refresh workflow with authenticated
  dataset refresh requests, duplicate-safe active job reuse, scoring status
  visibility, refresh-aware job metadata, frontend refresh controls, safe
  refresh alerts, and refresh ownership/failure tests.
- Updated scoring/jobs/enrichment/frontend/KB docs to mark manual
  refresh/reprocessing as current while keeping autonomous recurring refresh,
  provider sprawl, ML/AI, collaboration, auction execution, and broad external
  sync out of scope.
- Implemented Phase 13 enrichment orchestration foundation with explicit
  adapter outcomes, deliberate disabled/provider fallback records, freshness and
  reprocess-after metadata, reprocessing-ready scoring job summaries, frontend
  enrichment state visibility, and orchestration/fallback tests.
- Updated enrichment/API/KB docs to mark orchestration, fallback behavior, and
  recency-aware reprocessing readiness as current while keeping provider
  sprawl, ML/AI, collaboration, auction execution, and broad scheduled sync out
  of scope.

## 2026-05-25

- Implemented Phase 12 first external enrichment integration with a controlled
  U.S. Census Geocoder adapter, secure opt-in configuration, timeout and
  per-job row limits, safe external result persistence, worker-scoring
  integration, frontend detail visibility, and external enrichment tests.
- Updated enrichment/API/KB docs to mark one external enrichment path as
  current while keeping provider sprawl, paid integrations, ML/AI,
  collaboration, and auction execution as future work.
- Implemented Phase 11 enrichment adapter foundation with an enrichment service,
  source-field inference adapter, persisted scored-record enrichment metadata,
  enrichment-aware worker scoring, frontend enrichment/detail visibility, and
  enrichment tests.
- Added enrichment architecture documentation and updated API/KB docs to mark
  internal source-data enrichment as current for Phase 11 while keeping
  external enrichment providers, geocoding, ML/AI, collaboration, and auction
  execution out of that phase.
- Implemented Phase 10 worker and scheduler foundation with a dedicated API
  worker entrypoint, queued-job claiming, worker-driven dataset scoring,
  minimal scheduler module, frontend job-status polling, and worker/scheduler
  tests.
- Added worker and scheduler architecture documentation and updated API/KB docs
  to mark background execution groundwork as current while keeping external
  schedulers, third-party queues, enrichment adapters, delivery channels, ML/AI,
  collaboration, and auction execution as future work.
- Implemented Phase 9 alerts and monitoring foundation with tenant-owned alert
  records, authenticated alert list/read/read-all endpoints, scoring job
  completion/failure alert creation, a frontend alerts surface with unread
  state, and alert ownership tests.
- Added alerts API and architecture documentation and updated the KB pack to
  mark in-app alerts as current while keeping email/SMS delivery, realtime
  websockets, external schedulers, background workers, and ML/AI as future work.
- Implemented Phase 8 automation-ready job plumbing with a tenant-owned
  internal job model, queued/running/completed/failed lifecycle, job service,
  authenticated job detail route, dataset scoring job execution, safe job
  summaries/errors, frontend scoring job visibility, and job lifecycle tests.
- Added internal job API and architecture documentation and updated the KB pack
  to mark automation-ready plumbing as current while keeping external
  automation, schedulers, alerts, ML/AI, and auction execution as future work.
- Implemented Phase 7 portfolio tracking with tenant-owned portfolio items,
  authenticated add/list/detail/status/delete endpoints, promotion from scored
  records or watchlist items, cross-user portfolio protections, frontend track
  actions, a dedicated portfolio status surface, and portfolio tests.
- Added portfolio API and architecture documentation and updated the KB pack to
  mark portfolio/status tracking as current product surface while keeping
  automation, alerts, collaboration, auction execution, and ML as future work.
- Implemented Phase 6 watchlist workflow with tenant-owned watchlist items,
  authenticated add/list/remove endpoints, duplicate-safe adds, cross-user
  watchlist protections, frontend keep/remove actions from scored results, a
  dedicated watchlist comparison surface, and watchlist tests.
- Added watchlist API and architecture documentation and updated the KB pack to
  mark watchlist as current product surface while keeping portfolio, automation,
  alerts, collaboration, and ML as future work.
- Implemented Phase 5 frontend scored-results review surface with browser
  login/register, authenticated dataset list/detail views, score triggering,
  a dense scored-record table, row detail reasoning, flags, loading/empty/error
  states, and review-model unit tests.
- Added frontend review surface architecture documentation and updated the KB
  pack to mark score review as current visible product surface while keeping
  watchlists, portfolio, automation, and ML as future work.
- Implemented Phase 4 scoring foundation with a real pure scoring package,
  dataset row normalization, scored-record persistence, authenticated scoring
  routes, explainable score outputs, risk flags, confidence scoring, and
  tenant-scoped scoring tests.
- Added scoring API and architecture documentation and updated the KB pack to
  mark first-pass explainable scoring as current implementation truth while
  keeping frontend scoring UI, watchlists, portfolio, automation, and final
  underwriting as future direction.
- Implemented Phase 3 dataset foundation with authenticated CSV upload,
  tenant-owned dataset records, safe CSV parsing, dataset list/detail endpoints,
  and dataset ownership tests.
- Added `multer` as the minimal multipart upload middleware for manual CSV
  uploads.
- Added dataset API and architecture documentation and updated KB files to mark
  dataset foundation as current implementation truth.
- Aligned repository workflow policy with the current direct-to-`main` operating
  model after local quality gates and pre-push checks pass.
- Removed the CI step that intentionally failed direct pushes to `main` while
  keeping CI quality gates intact.
- Implemented Phase 2 authentication foundation with user model, registration,
  login, JWT issuance, auth middleware, protected `/auth/me`, request
  validation, and global API error handling.
- Added auth integration tests for successful flows, duplicate emails, invalid
  credentials, invalid payloads, malformed JSON, missing tokens, malformed auth
  headers, invalid tokens, and expired tokens.
- Added auth API and architecture documentation.
- Updated the KB pack to mark auth as current implementation truth while keeping
  ingestion, scoring, watchlists, portfolio, and automation as future direction.
- Accepted `feature/repository-discipline-and-auth-foundation` into local
  `main` by fast-forward.
- Added a full repo-grounded KB pack under `docs/kb/`.
- Added `docs/kb/security-hardening-kb.md` to make security posture, trust
  boundaries, tenant isolation, and future hardening requirements first-class
  architecture knowledge.
- Added `docs/README.md` as a top-level documentation index.

## 2026-05-24

- Added local pre-push quality gate hook.
- Updated CI to run on feature branches and fail direct pushes to `main`.
- Reconfigured repository workflow around `oneclick` as the primary remote and
  `origin` as the backup mirror.
- Added CI quality gate workflow and repository workflow documentation.
- Tagged the verified Phase 1 baseline as `v0.1-phase1-baseline`.
- Documented branch protection as blocked until the private repository is on an
  eligible GitHub plan or organization.
- Created Phase 1 monorepo baseline.
- Added Express API with `/healthz`.
- Added React/Vite/Tailwind frontend shell.
- Added MongoDB connection package.
- Added shared types package and scoring package placeholder.
- Added local MongoDB docker-compose configuration.
- Added Phase 1 unit and integration tests.
