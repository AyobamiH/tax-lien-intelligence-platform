# Ingestion Scripts

The product's normal authenticated CSV ingestion remains inside the existing API dataset service. P47-093 adds one separate protected lane for the private ChatGPT pilot so real evaluation data can reach the same tenant/scoring engine without adding any public upload or mutation capability to the staging gateway or MCP surface.

## Private ChatGPT real-data pilot

`.github/workflows/chatgpt-real-data-pilot.yml` is manual-only and default-branch-only. It uses the protected `chatgpt-real-data-pilot` environment and accepts the CSV only through `CHATGPT_PILOT_DATA_B64`. The operator must also supply the exact SHA-256 and confirm ownership, reuse rights, PII minimization, and no-training status.

`scripts/ingestion/chatgpt-real-data-pilot.mjs` then:

- rejects missing/future/stale provenance and any training-permitted claim;
- caps the protected source at 32 KiB and 250 rows;
- verifies the decoded CSV against the operator-supplied SHA-256;
- reduces the source to parcel id, lien amount, estimated value, property type, and situs address before persistence;
- discards owner, mailing, contact, email, phone, taxpayer-name, SSN, and every other unneeded column;
- verifies the already-provisioned identity has exactly one active owner workspace;
- reuses the existing `DatasetService`, then the existing scoring job/worker path;
- keeps versioned intelligence disabled for this pre-model evaluation so legacy heuristic outputs remain explicitly non-probabilistic;
- is idempotent for the same logical dataset, source date, and input digest; and
- archives only a sanitized aggregate receipt. Raw CSV, raw rows, parcel values, credentials, tokens, email identity, workspace ids, and database ids are not artifacts.

The persisted source label explicitly says `private-pilot-evidence-only` and `upload-does-not-establish-county-authority`. A rights attestation allows this bounded private evaluation; it does not silently promote a tenant upload into an official county source or a model-training dataset.

The lane has a fixed 30-day pilot retention policy recorded in the sanitized receipt. Operational deletion remains under the accountable pilot owner's retention/deletion process until a separately reviewed automatic retention job is added; the lane does not claim automated deletion.

Synthetic-only boundary tests live in `scripts/test-chatgpt-real-data-pilot.mjs`. Actual real-data execution evidence must come from the protected workflow and must still be followed by the real connected ChatGPT evaluation suite in `docs/product/chatgpt-release-evaluation.json`.
