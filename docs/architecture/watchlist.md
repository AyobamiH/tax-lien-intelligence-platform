# Watchlist Workflow Architecture

## Scope

Phase 6 introduces the first deliberate decision layer after scoring review. A
watchlist item represents a user-owned scored record that the user wants to keep
for later comparison.

Implemented:

- tenant-owned `WatchlistItem` Mongo model;
- backend watchlist store and service layers;
- authenticated `POST /watchlist`, `GET /watchlist`, and
  `DELETE /watchlist/:watchlistItemId` routes;
- ownership validation against scored records before a watchlist item can be
  created;
- idempotent duplicate handling;
- frontend keep/remove actions from scored results;
- dedicated `#/watchlist` comparison surface;
- watchlist detail view with flags and reasoning;
- backend integration tests and frontend review-model tests.

Not implemented:

- notes;
- tags;
- decision statuses;
- portfolio tracking;
- alerts;
- collaboration;
- auction execution workflows.

## Data Model

The watchlist item stores:

- `userId`;
- `datasetId`;
- `scoredRecordId`;
- source row number;
- normalized field snapshot;
- score snapshot;
- flags and reasoning through the score snapshot;
- `addedAt`;
- timestamps.

The denormalized snapshot keeps the watchlist useful as a comparison surface
without requiring a broad join from the browser. It also preserves the visible
reasoning that caused the user to keep the record.

## API Boundary

The frontend can only add a watchlist item by sending a `scoredRecordId`.

The backend:

- derives `userId` from the verified JWT;
- verifies the scored record exists for that user;
- stores a snapshot of safe scored-record fields;
- returns a safe response that omits `userId`;
- rejects cross-user references with not-found errors.

## Frontend Boundary

The frontend integrates watchlist state into the Phase 5 review surface:

- scored rows show whether they are already kept;
- selected score details can be kept or removed;
- the watchlist page renders a dense comparison table;
- selected watchlist detail displays reasoning and flags.

The UI does not treat hidden buttons or local state as authorization. Backend
ownership checks remain the security boundary.

## Scoring Relationship

Watchlist items reference scored records, not raw dataset rows. The scoring store
now preserves scored-record identifiers across repeat scoring of the same source
row where possible, so watchlist state remains stable when a dataset is rescored.

The score snapshot is still retained on the watchlist item because future scoring
models may evolve. If a future phase introduces score-version comparison or
refresh prompts, this document should be updated.

## Security Notes

The watchlist is private tenant data because it reveals user intent and
investment interest. Security expectations:

- auth required on every route;
- no client-supplied `userId`;
- cross-user add/delete/list attempts are tested;
- duplicate add handling does not leak another tenant's records;
- responses expose only safe score summaries, flags, and reasoning.

## Drift Risks

Do not:

- turn watchlist into portfolio tracking without a new phase;
- accept client-submitted score snapshots;
- add notes/statuses without validation and tenancy tests;
- expose `userId` in browser responses;
- infer ownership from frontend state.

## Update Rules

Update this document when:

- watchlist fields change;
- notes, tags, statuses, or portfolio handoff become real;
- scoring/watchlist refresh behavior changes;
- watchlist endpoints or response contracts change.
