# Shared Contract KB

## What This File Governs

This file governs shared contracts between the frontend, API, database-facing
services, and scoring package. It prevents UI/API drift.

It does not replace endpoint-specific API docs or implementation tests.

## Current Shared Types

Phase 47 adds an independent engine-boundary package at
`packages/engine-contract`:

- `CandidateEvidenceV1` with versioned, field-level provenance and explicit
  observed, derived, unknown, and not-applicable states;
- `EngineResultV1` with assessed, insufficient-evidence, and out-of-scope
  outcomes;
- method and availability distinctions for deterministic, heuristic,
  model-backed, unknown, unavailable, and not-applicable signals;
- `ModelArtifactRefV1` with artifact digest, training-dataset version, and
  evaluation-report reference;
- dependency-free runtime validators and strict JSON Schemas;
- a hard contract rule that a redemption probability is available only from a
  versioned model artifact.

The existing `packages/scoring` output remains a compatibility contract. API
responses add `legacyScoring` metadata so its `redemptionProbability` value is
identified as a fixed heuristic and not a probability.

`packages/types` now also defines the platform compatibility envelope:

- `completed` contains a contract-valid `EngineResultV1`;
- `not_configured` contains no result;
- `failed` contains a bounded failure code and no result;
- internal-job summaries count each state for operational visibility.

The API client verifies result identity, evidence version, and digest before
the completed state can cross into persistence.

Phase 47 also adds `packages/jurisdiction-rules` as a server-side consumer of
the engine contract. Its registry is exact-jurisdiction and version based. The
current Maricopa pack returns a contract-valid assessed,
insufficient-evidence, or out-of-scope result; resolves legal findings through
versioned citations; computes only deterministic value coverage; and keeps
redemption probability unavailable. Current county auction mechanics are not
yet a verified contract.

Current shared types in `packages/types`:

- Phase 45 extends the follow-up contract with `completed` due state,
  completion metadata, snooze metadata, prior due-date context, explicit
  complete/snooze response DTOs, and a narrower alert due-state contract that
  only allows `due` or `overdue` in `follow_up_due` alert metadata;
- Phase 46 adds browser-like contract smoke coverage for follow-up state,
  upsert, complete, and snooze calls from the React shell. It verifies auth and
  workspace headers against the existing DTOs without changing shared types;

- `RuntimeEnvironment`;
- `HealthStatus`;
- `HealthResponse`;
- `ApiErrorResponse`;
- `TenantId`.
- `WorkspacePolicyRules`;
- `WorkspacePolicyResponse`;
- `UpdateWorkspacePolicyRequest`;
- `WorkspacePolicyAction`;
- `WorkspacePolicyRequirementCode`;
- `WorkspacePolicyUnmetRequirement`;
- `WorkspacePolicyEvaluation`.
- `DecisionBriefTargetEntityType`;
- `DecisionBriefReadinessStatus`;
- `DecisionBriefSummary`;
- `DecisionBriefApprovalSummary`;
- `DecisionBriefPolicySummary`;
- `DecisionBriefDiscussionSummary`;
- `DecisionBriefHistorySummary`;
- `DecisionBriefResponse`.
- `DecisionOutcomeTargetEntityType`;
- `DecisionOutcomeStatus`;
- `DecisionOutcomeActor`;
- `DecisionOutcomeResponse`;
- `DecisionOutcomeStateResponse`;
- `UpsertDecisionOutcomeRequest`;
- `UpsertDecisionOutcomeResponse`.
- `OutcomeReviewStatusCount`;
- `OutcomeReviewEntityTypeCount`;
- `OutcomeReviewTargetSummary`;
- `OutcomeReviewResolution`;
- `OutcomeReviewSignalSeverity`;
- `OutcomeReviewSignalCode`;
- `OutcomeReviewSignal`;
- `OutcomeReviewSummary`;
- `OutcomeReviewResponse`.
- `AuthUserResponse`;
- `AuthSuccessResponse`;
- `AuthMeResponse`;
- `AuthenticatedPrincipal`.
- `WorkspaceRole`;
- `WorkspaceMembershipStatus`;
- `WorkspacePermissions`;
- `WorkspaceResponse`;
- `WorkspaceMemberResponse`;
- `WorkspaceListResponse`;
- `CurrentWorkspaceResponse`;
- `WorkspaceMembersResponse`;
- `AddWorkspaceMemberRequest`;
- `AddWorkspaceMemberResponse`;
- `UpdateWorkspaceMemberRoleRequest`;
- `UpdateWorkspaceMemberRoleResponse`;
- `DeactivateWorkspaceMemberResponse`.
- `WorkspaceActivityCategory`;
- `WorkspaceActivityEventType`;
- `WorkspaceActivityRelatedEntityType`;
- `WorkspaceActivityActor`;
- `WorkspaceActivityMetadata`;
- `WorkspaceActivityResponse`;
- `WorkspaceActivityListResponse`.
- `WorkspaceCommentEntityType`;
- `WorkspaceCommentAuthor`;
- `WorkspaceCommentResponse`;
- `WorkspaceCommentListResponse`;
- `CreateWorkspaceCommentRequest`;
- `CreateWorkspaceCommentResponse`;
- `DeleteWorkspaceCommentResponse`.
- `DatasetStatus`;
- `DatasetSourceType`;
- `DatasetImportAdapterId`;
- `DatasetImportSource`;
- `DatasetImportConfidence`;
- `DatasetImportSummary`;
- `DatasetReadinessStatus`;
- `DatasetReadinessIssueSeverity`;
- `DatasetReadinessFieldName`;
- `DatasetReadinessFieldCoverage`;
- `DatasetReadinessIssue`;
- `DatasetReadinessSummary`;
- `DatasetManualMappingTarget`;
- `DatasetManualMappingSource`;
- `DatasetManualMappingEntry`;
- `DatasetManualMappingSummary`;
- `SaveDatasetManualMappingRequest`;
- `DatasetManualMappingContextResponse`;
- `SaveDatasetManualMappingResponse`;
- `DatasetValidationSummary`;
- `DatasetResponse`;
- `DatasetListResponse`;
- `DatasetDetailResponse`.
- `PropertyTypeCategory`;
- `NormalizedScoredRecordFields`;
- `EnrichmentAdapterId`;
- `EnrichmentConfidence`;
- `EnrichedFieldName`;
- `EnrichedScoredRecordFields`;
- `EnrichmentSignal`;
- `EnrichmentResult`;
- `ScoredRecordResponse`;
- `InternalJobStatus`;
- `InternalJobType`;
- `InternalJobTargetType`;
- `InternalJobSummary`;
- `InternalJobError`;
- `InternalJobResponse`;
- `MaintenanceDecision`;
- `DatasetMaintenanceMode`;
- `DatasetMaintenanceStatus`;
- `JobDetailResponse`;
- `DatasetScoreJobResponse`;
- `DatasetScoreRunResponse` for internal execution results;
- `DatasetScoresResponse`.
- `AlertType`;
- `AlertSeverity`;
- `AlertStatus`;
- `AlertRelatedEntityType`;
- `AlertMetadata`;
- `AlertResponse`;
- `AlertListResponse`;
- `AlertDetailResponse`;
- `MarkAllAlertsReadResponse`.
- `NotificationPreferenceRule`;
- `NotificationPreferencesResponse`;
- `NotificationPreferenceCategory`;
- `NotificationPreferencesDetailResponse`;
- `UpdateNotificationPreferencesRequest`;
- `NotificationDeliveryPreparation`.
- `NotificationDeliveryChannel`;
- `NotificationDeliveryStatus`;
- `NotificationDeliveryFailureCode`;
- `NotificationDeliveryOutcome`.
- `NotificationDigestBatchStatus`;
- `NotificationDeliveryHistoryItem`;
- `NotificationDigestBatchResponse`;
- `NotificationDeliveryHistoryResponse`;
- `NotificationDigestProcessingResult`.
- `AddWatchlistItemRequest`;
- `WatchlistItemResponse`;
- `AddWatchlistItemResponse`;
- `WatchlistListResponse`;
- `DeleteWatchlistItemResponse`.
- `PortfolioStatus`;
- `AddPortfolioItemRequest`;
- `UpdatePortfolioItemRequest`;
- `PortfolioItemResponse`;
- `AddPortfolioItemResponse`;
- `PortfolioListResponse`;
- `PortfolioDetailResponse`;
- `UpdatePortfolioItemResponse`;
- `DeletePortfolioItemResponse`;
- `PortfolioStatusCount`;
- `PortfolioSummaryRecord`;
- `PortfolioActivitySummary`;
- `PortfolioAttentionReason`;
- `PortfolioAttentionSummary`;
- `PortfolioSummaryResponse`.
- `SavedViewSurface`;
- `SavedViewPortfolioFilters`;
- `SavedViewComparisonFilters`;
- `SavedViewSort`;
- `SavedViewResponse`;
- `CreateSavedViewRequest`;
- `SavedViewListResponse`;
- `ApplySavedViewResponse`;

Current scoring package:

- pure scoreable record and result contracts;
- modular scoring function exports;
- `SCORING_PACKAGE_VERSION`.

## Current Response Shape

Health response shape:

```json
{
  "service": "tax-lien-api",
  "status": "ok",
  "timestamp": "2026-05-24T00:00:00.000Z",
  "environment": "development"
}
```

Error response shape:

```json
{
  "error": {
    "code": "route_not_found",
    "message": "The requested API route does not exist."
  }
}
```

This structured error shape should become the default API pattern.

## Future DTO Direction

Future shared DTOs should be introduced when they cross package/app boundaries.

Likely future DTO families:

- auth request types if the frontend begins importing them;
- parcel row;
- API error codes.

Avoid adding types too early when the domain is still being discovered. Add them
as feature contracts become real.

## Auth Payload Expectations

Current auth response contracts include:

- safe user response;
- auth success response;
- current user response;
- authenticated principal.

Future auth request contracts may include:

- register request;
- login request;
- auth error responses.

Do not expose:

- password hashes;
- JWT secrets;
- internal database fields not intended for clients.

## Error Object Expectations

Future API errors should keep:

- stable `code`;
- safe `message`;
- no stack trace;
- no raw database error;
- no secret;
- no another-tenant details.

Frontend code should branch on stable codes where needed and display safe
messages.

## Dataset Object Direction

Current dataset contracts include:

- dataset id;
- original filename;
- source type;
- optional source label;
- status;
- row count;
- column count;
- headers;
- import summary;
- readiness summary;
- manual mapping summary;
- import profile application summary;
- validation summary;
- upload and created/updated timestamps.

Owner is implied by auth, not client-set. Do not let frontend contracts accept
`userId` for creating datasets.

The Phase 17 browser upload flow uses the existing `DatasetDetailResponse` from
`POST /datasets`. The frontend sends multipart form data containing `file` and
optional `sourceLabel`; it does not invent a browser-only dataset contract.

## Dataset Import Summary Contract

Phase 16 adds a safe import summary contract for dataset responses. It includes:

- whether a county adapter matched;
- adapter id and display name;
- source type: `generic_csv` or `county_adapter`;
- confidence: `low`, `medium`, or `high`;
- whether generic fallback was used;
- mapped canonical field names;
- safe warnings.

Current adapter ids:

- `generic_csv`;
- `maricopa_tax_lien_v1`.

The import summary is browser-safe metadata. It must not expose raw source rows,
file contents, parser internals, county provider payloads, or client-supplied
`userId`. A matched adapter improves deterministic mapping into stored source
rows, but it is not proof of county identity or broad county coverage.

## Dataset Readiness Summary Contract

Phase 18 adds `DatasetReadinessSummary` to `DatasetResponse`.

It includes:

- `status`: `ready`, `partial`, `weak`, or `blocked`;
- `score`: 0-100 import readiness score;
- `scoringRecommended`: whether scoring is recommended for this import quality;
- `fieldCoverage`: safe coverage for parcel identifier, lien amount, estimated
  value, property type, and address context;
- `issues`: safe issue codes, severities, messages, and optional field names;
- `guidance`: safe user-facing next-step guidance.

This contract is produced by the backend and displayed by the frontend. The
frontend must not calculate trusted readiness independently, accept client
readiness fields, or treat readiness as a manual field-mapping result.

Readiness summaries must not expose raw source rows, uploaded file contents,
parser internals, stack traces, or another tenant's data.

## Dataset Manual Mapping Contract

Phase 19 adds `DatasetManualMappingSummary` to `DatasetResponse` and mapping
context/save responses.

Manual mapping contracts include:

- supported target field;
- source column name from the dataset headers;
- source marker: `manual`;
- update timestamp.

The save request accepts a partial record of target fields to source columns or
`null` to clear a mapping. The backend validates target fields and source
columns; the frontend must not send `userId`, raw row values, or trusted score
values.

Manual mappings are repair metadata. They do not represent rewritten source
rows, row-level edits, or a broad spreadsheet transformation contract.

Phase 20 extends the mapping source marker to distinguish `manual` from
`import_profile`. Profile-derived mappings still use the same safe overlay
contract; they do not rewrite rows.

## Import Profile Contract

Phase 20 adds import profile contracts:

- `ImportProfileResponse`;
- `ImportProfileListResponse`;
- `SaveImportProfileFromDatasetRequest`;
- `ApplyImportProfileToDatasetRequest`;
- `DatasetImportProfileApplicationSummary`.

Import profile responses include:

- profile id;
- profile name;
- optional source label;
- adapter id/name context;
- target-to-source-column mapping rules;
- normalized header signature and source-column applicability metadata;
- created-from dataset id when available;
- timestamps.

Dataset responses include profile application state:

- `none`;
- `suggested`;
- `auto_applied`;
- `user_applied`.

The contract intentionally exposes only mapping rules and safe matching
metadata. It must not expose source rows, uploaded file contents, profile owner
ids, cross-user suggestions, ML scores, or hidden parser internals.

## Parcel Object Direction

Future standalone parcel contracts should include:

- parcel id;
- source dataset id;
- normalized parcel identifier;
- address or location fields if available;
- lien amount;
- estimated value;
- property type;
- validation warnings;
- score summary if computed.

The exact schema should be decided during implementation and documented in API
docs.

## Score Object Contract

Current score contracts include:

- `investmentScore`;
- `riskScore`;
- `liquidityScore`;
- `redemptionProbability`;
- `confidenceScore`;
- optional `valueCoverageRatio`;
- `flags`;
- `reasoning`;
- optional `enrichment`;
- normalized source fields;
- source row number;
- timestamps.

Scores should be server-derived. The client should not submit trusted score
values.

Current score routes return:

- `DatasetScoreJobResponse` from `POST /datasets/:datasetId/score`;
- `DatasetRefreshJobResponse` from `POST /datasets/:datasetId/refresh`;
- `DatasetScoringStatusResponse` from
  `GET /datasets/:datasetId/scoring-status`;
- `DatasetScoresResponse` from `GET /datasets/:datasetId/scores`.

`POST /datasets/:datasetId/score` returns queued job metadata. The frontend
uses `GET /jobs/:jobId` and then `GET /datasets/:datasetId/scores` after the
worker completes scoring.

`POST /datasets/:datasetId/refresh` returns queued job metadata or the active
queued/running dataset job when refresh is already in progress. It must not
create duplicate refresh jobs for repeated user actions.

`DatasetScoringStatusResponse` includes a `maintenance` object with manual-only
versus policy-auto-refresh mode, eligibility, and a safe user-facing message. It
must not expose raw scheduler internals.

`DatasetScoreRunResponse` remains the internal execution result shape used by
the scoring service and tests, not the public score-trigger response.

The Phase 5 frontend review surface imports these shared response types and
does not define a separate browser-only score contract.

The contract represents first-pass explainable scoring, not final underwriting.

## Enrichment Object Contract

Current enrichment contracts include:

- adapter ids;
- orchestration version;
- adapter outcomes with stage, status, safe message, and timestamps;
- freshness metadata with source version and reprocess timing;
- data quality score;
- inferred field snapshot;
- optional safe external enrichment results;
- signals with field, confidence, and safe message;
- safe flags;
- safe reasoning.

Current adapter ids:

- `source_field_inference`.
- `census_geocoder`.

The frontend may display enrichment context, but it must not treat enrichment as
final underwriting truth. External enrichment responses may expose normalized
address/location context, provider tag, confidence, status, and timestamp. They
must not expose raw source rows, stack traces, provider payloads, request
internals, or secrets.

## Internal Job Contract

Current job contracts include:

- job id;
- type;
- target entity type;
- target entity id;
- request kind: `score`, `refresh`, `policy_refresh`, or `maintenance_scan`;
- status;
- optional safe summary;
- optional safe error;
- queued/started/completed/failed timestamps;
- created/updated timestamps.

Current job types:

- `dataset_scoring`.
- `dataset_maintenance`.

Current target entity type:

- `dataset`.

Jobs are user-owned operational metadata. The frontend must not submit `userId`
or raw job payloads, and job responses must not expose raw internals.

Phase 10 adds worker claiming for queued jobs. This changes execution timing,
but not the public job response contract.

Phase 14 adds refresh request metadata and dataset scoring status states. The
status response is a safe user-facing summary, not a raw job log.

Phase 15 adds safe maintenance summary fields for scanned/stale/skipped counts,
maintenance decision, policy mode, and optional follow-on refresh job id. Policy
refresh jobs must remain distinguishable from manual refresh jobs.

## Alert Object Contract

Current alert contracts include:

- alert id;
- type;
- severity;
- read/unread status;
- safe human-readable message;
- optional related entity type/id;
- optional safe metadata;
- optional delivery-preparation classification;
- created/updated timestamps;
- optional read timestamp.

Current alert types:

- `scoring_job_completed`;
- `scoring_job_failed`;
- `workspace_comment_added`;
- `workspace_item_assigned`;
- `followed_item_changed`;
- `follow_up_due`.

Current alert metadata is limited to safe identifiers and summary values:

- job id;
- dataset id;
- scored record count;
- stable error code;
- request kind;
- workspace id, comment id, and member-visible actor identity for discussion
  alerts;
- workspace id, follow event id, allowlisted change type, and verified actor
  identity for followed-item updates;
- workspace id, assignment id, and member-visible actor identity for assignment
  alerts;
- workspace id, follow-up id, due date, and due state for follow-up alerts.

Alert contracts must not expose raw job payloads, stack traces, source rows,
tokens, secrets, provider responses, or another tenant's data. Email delivery
outcomes are tracked server-side through the notification delivery outbox; SMS,
push, and realtime delivery contracts are not implemented.

## Notification Preference Contract

Current notification preference contracts include:

- preference id;
- rules for supported alert types;
- enabled/disabled state;
- delivery mode: `in_app_only` or `delivery_eligible`;
- cadence: `immediate` or `digest`;
- category metadata for frontend display;
- provider-agnostic delivery preparation for generated alerts.
- email delivery status/failure enums for server-side outbox tracking.
- digest batch status and scheduler result contracts;
- safe owner-facing delivery and digest history response contracts.

Notification preferences cover supported scoring, workspace-discussion,
workspace-assignment, followed-item, and follow-up alert types. They must not
become a broad messaging rules engine, marketing preference center, shared/team
policy model, provider configuration payload, SMS/push contract, or realtime
push contract without a separate product and security phase.

## Watchlist Object Contract

Current watchlist contracts include:

- watchlist item id;
- source dataset id;
- source scored record id;
- source row number;
- normalized field snapshot;
- score summary;
- flags;
- reasoning;
- scored timestamp;
- added timestamp;
- created/updated timestamps.

The backend verifies the watched scored record belongs to the authenticated user
before creating a watchlist item. The frontend must not submit score values or
`userId`.

Future watchlist contracts may add notes, tags, or decision status, but only
with validation, API docs, and tenancy tests.

## Portfolio Object Contract

Current portfolio contracts include:

- portfolio item id;
- source dataset id;
- source scored record id;
- optional source watchlist item id;
- status;
- status update timestamp;
- source row number;
- normalized field snapshot;
- score summary;
- flags;
- reasoning;
- scored timestamp;
- tracked timestamp;
- created/updated timestamps.

Portfolio creation accepts exactly one owned `scoredRecordId` or one owned
`watchlistItemId`. The backend verifies ownership and creates the score snapshot.
The frontend must not submit score values or `userId`.

Current status values are `tracked`, `reviewing`, `ready`, `acquired`, `closed`,
and `discarded`.

Future portfolio contracts may add notes, tags, alerts, or richer decision
history, but only with validation, API docs, and tenancy tests.

Current portfolio summary contracts include:

- total tracked, active, ready, and acquired counts;
- status distribution for each supported portfolio status;
- recent additions using the tracked timestamp;
- recent status changes using the status update timestamp;
- conservative needs-attention entries grounded in status, scoring flags, and
  confidence;
- smaller summary records with safe identifiers, normalized display fields,
  scores, flag counts, and timestamps.

Portfolio summaries are dashboard contracts. They must not become raw source-row
exports, accounting ledgers, P&L objects, broad analytics payloads, or
cross-tenant activity feeds.

## Workspace Activity Contract

Current workspace activity contracts include:

- workspace-scoped activity id;
- actor user id and member-visible email;
- category: `data`, `decisions`, `portfolio`, `members`, `responsibility`, or
  `approvals`, or `cadence`;
- allowlisted event type;
- related entity type/id;
- server-derived summary;
- bounded optional metadata for navigation/rendering;
- occurrence timestamp;
- list response.

Clients may request a category filter but cannot create events or submit
summary text. Metadata must not contain notes, raw rows, raw errors, provider
payloads, secrets, compatibility tenant keys, or arbitrary objects. Empty feeds
return an empty `activities` array.

Workspace activity is broader than comparison item history but shallower. It
must not be represented as chat, a notification inbox, or a legal/compliance
audit contract.

## Workspace Assignment Contract

Current assignment contracts include:

- one current assignment per workspace, entity type, and entity id;
- supported types: dataset, comparison item, watchlist item, and portfolio item;
- current assignee and assigning actor user id/email;
- assigned and updated timestamps;
- detail response with nullable assignment;
- update response with explicit `changed` no-op state;
- clear response with explicit `cleared` no-op state;
- bounded assigned-to-me list response.

Clients submit only the requested assignee user id. The backend derives actor
and workspace identity, verifies active membership, and rechecks target access.
Assignment contracts must not grow task status, due dates, reminders,
priorities, subtasks, approval state, or arbitrary metadata without a separate
phase.

## Follow-Up Contract

The current follow-up contract is allowlisted to `comparison_item`,
`watchlist_item`, and `portfolio_item`.

Follow-up responses include:

- follow-up id;
- workspace id;
- target entity type/id;
- due date;
- derived due state: `none`, `upcoming`, `due`, `overdue`, or `cleared`;
- reminder state;
- optional bounded note;
- creator/updater ids;
- optional current assignee id;
- optional cleared actor/timestamp;
- created/updated timestamps.

Clients submit only the target type/id in the URL and a bounded due date/note
body for create/update. The backend derives workspace, actor, target access,
assignee, due state, reminder state, activity, and alert recipients.

`follow_up_due` alerts contain safe target metadata, follow-up id, due date,
and due state only. They must not include follow-up note text, record contents,
calendar payloads, recurrence rules, or SLA fields.

This contract is a bounded operational cadence layer. It is not a generic task
object, calendar event, recurrence engine, escalation policy, workforce plan,
or auction-execution workflow.

## Workspace Discussion Attention Contract

Current discussion attention contracts include:

- workspace id;
- related entity type/id;
- unread count and `hasUnread`;
- optional last-read and latest-comment timestamps;
- list/create responses that include the current member's attention state;
- explicit mark-read response.

Attention is keyed server-side by authenticated user, verified workspace, and
thread. Clients never submit a user id or unread count. Comment alert payloads
must not include comment body text, and alert state must not be treated as a
replacement for the thread's explicit unread state. Marking a thread read also
acknowledges matching personal discussion alerts.

## My Work Contract

The current my-work response composes existing contracts:

- verified workspace id and server generation timestamp;
- assigned, reviewable-approval, unread-thread, unread-message, follow-up, and
  total actionable counts, plus a separate followed-record count;
- assignment, approval, discussion, follow-up, and following queues with total
  count plus at most eight preview items;
- existing assignment, approval, discussion-attention, follow-up, and
  follow-subscription item shapes.

The authenticated actor is implicit. Clients must not submit a user id, role,
workspace id in the body, target access decision, reviewer eligibility, unread
count, or priority. Approval entries require server-derived `canReview`, and
all target-backed entries must survive current access revalidation. Discussion
entries never include comment body text.

This contract is an aggregation response, not a task, priority, SLA, workload,
calendar, recurrence, or activity-feed contract.
Following is informational and does not contribute to `totalActionable`.

## Follow Subscription Contract

The current follow contract is intentionally allowlisted:

- target entity types: `dataset`, `comparison_item`, `watchlist_item`, and
  `portfolio_item`;
- server-derived workspace and follower identity;
- subscription id, target type/id, and followed timestamp;
- actor-specific followed state and active follower count;
- duplicate-safe create result with `alreadyFollowing`;
- idempotent delete result with `unfollowed`;
- personal selected-workspace list.

Clients submit only the target type/id in the URL. They must not submit user
ids, workspace ids, follower counts, target access decisions, notification
recipients, or timestamps. Following does not grant access or responsibility.

`followed_item_changed` alerts use an allowlisted change type:
`assignment_changed`, `portfolio_status_changed`, or `approval_resolved`.
Notification payloads contain bounded actor and target metadata, never record
contents. The contract is not a social graph, presence, reaction, mention,
recommendation, or arbitrary event-subscription model.

## Review Checklist Contract

The checklist contract is allowlisted to `comparison_item`, `watchlist_item`,
and `portfolio_item`.

Template responses contain server-derived workspace id, target type, bounded
name, active state, version, stable ordered item ids, required flags, and
timestamps. Owners/admins may submit a bounded replacement template. Existing
item ids may only refer to the current template; new ids are server-generated.

Record state contains the applicable template, a versioned record snapshot,
item completion with optional verified actor/timestamp, and a derived progress
summary. Status is `not_configured`, `not_started`, `in_progress`, or `ready`;
readiness means all required items are complete.

Clients submit only template content or one boolean completion change. They
must not submit workspace identity, completing actor, timestamp, access
decisions, readiness totals, or action authorization. Readiness is a decision
signal and becomes an enforced prerequisite only when the selected workspace
enables its fixed checklist policy. It is not approval authority, compliance
evidence, or a generic workflow contract.

## Workspace Policy Contract

The workspace policy contract is a complete three-boolean rule object rather
than arbitrary key/value data. Policy failures use the existing API error
envelope and add structured `details` with the evaluated action and every unmet
requirement. Clients must render server messages safely and must not infer that
a hidden target exists from a policy failure.

## Saved View Contract

Current saved-view contracts include:

- saved view id;
- surface: `portfolio` or `comparison`;
- display name and optional description;
- validated filter object for the selected surface;
- optional validated sort;
- created/updated timestamps;
- list response with user-created views and built-in queues;
- apply response that returns matching portfolio or comparison records.

Portfolio saved-view filters are limited to statuses, practical queues, flag
presence, risk threshold, and confidence threshold. Comparison saved-view filters
are limited to decisions, source types, practical queues, and note presence.

Saved-view contracts must remain explicit and deterministic. They must not
become arbitrary field selectors, SQL-like query contracts, hidden-field
exposure, report-builder payloads, spreadsheet export schemas, or shared/team
view contracts without a new access-control design.

## Comparison Object Contract

Current comparison contracts include:

- comparison item id;
- default workspace id;
- source dataset id;
- source scored record id;
- source type: `score`, `watchlist`, or `portfolio`;
- optional source watchlist item id;
- optional source portfolio item id;
- decision state;
- decision update timestamp;
- optional bounded plain-text note;
- note update timestamp when present;
- source row number;
- normalized field snapshot;
- score summary;
- flags;
- reasoning;
- scored timestamp;
- added timestamp;
- created/updated timestamps.

Comparison creation accepts exactly one owned `scoredRecordId`, one owned
`watchlistItemId`, or one owned `portfolioItemId`. The backend verifies
ownership and creates the score snapshot. The frontend must not submit score
values, `userId`, workspace ownership, normalized fields, or source snapshots.

Current decision values are `undecided`, `keep_reviewing`, `move_forward`, and
`rejected`.

Notes are plain text, trimmed, capped at 500 characters, and validated for
unsupported control characters. They are decision notes, not rich text,
comments, legal-grade audit trails, or task records.

Current decision history contracts include:

- history event id;
- related entity type, currently `comparison_item`;
- related comparison item id;
- event type: `comparison_decision_changed` or `comparison_note_changed`;
- optional previous/new decision values;
- optional previous/current bounded note snapshots;
- optional safe metadata: workspace id, dataset id, scored record id, and
  source type;
- optional handoff metadata: target entity type/id, `created` versus
  `already_exists`, and portfolio status when relevant;
- created/updated timestamps.

Decision history retrieval is `GET /comparison/:comparisonItemId/history` and
is scoped through ownership of the comparison item. The frontend must not submit
history events, source metadata, raw rows, raw note diffs, or ownership fields.

Current comparison handoff contracts include:

- `POST /comparison/:comparisonItemId/handoff/watchlist`;
- `POST /comparison/:comparisonItemId/handoff/portfolio`;
- destination value: `watchlist` or `portfolio`;
- destination item response using the existing watchlist/portfolio item shapes;
- `alreadyExists` duplicate result;
- server-created history event with target linkage.

Portfolio handoff may accept an optional portfolio `status` and defaults to
`tracked`. Handoff requests must not include user ids, target ids, score
snapshots, source snapshots, or history metadata.

Direct comparison-to-portfolio handoff is owner-only in Phase 36. Admin/member
transitions use the approval request contract below.

## Approval Request Contract

Current approval contracts are intentionally allowlisted:

- target entity type: `comparison_item`;
- requested action: `comparison_handoff_to_portfolio`;
- status: `pending`, `approved`, `rejected`, or `cancelled`;
- verified requester and optional reviewer actor projections;
- bounded request note and optional reviewer response note;
- optional portfolio outcome with target id and `alreadyExists`;
- server-derived `canReview` and `canCancel`;
- created, updated, and optional resolved timestamps.

Creation accepts only target type/id, action, and request note. Approval and
rejection accept only an optional or required response note respectively. The
client must never submit workspace id, actor ids/emails/roles, status, outcome,
permission booleans, or timestamps.

Approval notes are plain text, trimmed, capped at 500 characters, and excluded
from workspace activity metadata. Approval executes the existing
comparison-to-portfolio contract only after server-side target revalidation.
This contract does not model workflow steps, custom reviewer rules, quorums,
SLAs, escalation, e-signatures, or general task approval.

Future comparison contracts may add multiple workspaces, note history, or
collaboration only with validation, API docs, tenancy tests, and an explicit
architecture decision.

## Compatibility And Versioning Guidance

Because this is early, contract churn is acceptable only when paired with:

- code changes;
- tests;
- docs;
- changelog entries.

Once real users exist, contract changes should be backward-compatible where
possible or explicitly versioned.

## Anti-Drift Rules

- Do not duplicate API contracts only in frontend components.
- Do not let API responses grow undocumented fields that UI depends on silently.
- Do not let package types describe future fields as current response fields.
- Do not add client-supplied `userId` to create/update DTOs for user-owned data.
- Do not add client-supplied compatibility tenant keys to workspace-shared
  resource DTOs; derive them from verified workspace membership.
- Keep the `owner`/`admin`/`member` role set explicit and do not smuggle a
  custom permission language into shared contracts.
- Keep `WorkspaceMembershipStatus` limited to the implemented active/inactive
  lifecycle and expose `canRemoveMembers` with the other server-derived
  workspace permission booleans.
- Keep membership removal as a server-authorized deactivation response; never
  accept actor, workspace, owner, or status fields from the client.
- Keep workspace activity enums and metadata allowlisted; do not accept
  client-authored summaries or general event payloads.
- Keep approval target/action/status enums allowlisted, derive reviewer
  authority server-side, and never expose note text through activity metadata.
- Keep my-work queues actor/workspace derived, bounded, target-revalidated, and
  free of comment bodies or invented urgency metadata.
- Keep follows actor/workspace qualified, duplicate-safe, target-revalidated,
  and incapable of granting access or authority.
- Keep checklist templates workspace qualified, role managed, versioned,
  bounded, and separate from record authorization and approval authority.
- Do not represent scoring as a single number once explainable scoring exists.
- Do not treat alert metadata as a raw logging or diagnostic payload.
- Do not let enrichment contracts imply external verification when enrichment is
  only internal source-row inference.
- Do not let an import adapter summary imply broad county coverage or live
  county verification.
- Do not let readiness summaries imply manual field mapping or final scoring
  confidence.
- Do not let manual mapping contracts expand into arbitrary row mutation without
  a separate domain/security phase.
- Do not let import profile contracts become cross-tenant shared knowledge,
  hidden ML suggestions, or a broad ETL rule-builder without a separate phase.

## Security Contract Rules

Shared contracts must not expose:

- password hashes;
- secrets;
- raw internal errors;
- raw alert/job internals;
- another user's identifiers;
- workspace owner compatibility keys or membership internals beyond safe ids;
- admin-only fields;
- server-derived trust fields as client-writable inputs.

## Update Rules

Update this file when:

- shared types change;
- endpoint contracts are introduced;
- error shapes change;
- scoring output shape is implemented;
- frontend/API contract boundaries change.
