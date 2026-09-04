# P47-093 private staging evidence — 4363e3e6

## Outcome

The merged OAuth consent CSP correction is live on the governed private staging service and the complete protected staging verification passed on 2026-09-01.

- Green merged main: `eab48cbead74762b7d851baaf7c69f09ff314fc2`
- Deployment trigger revision: `4363e3e6c451cee64df903dbe46972f956e014b3`
- Source tree shared by both revisions: `338111c5ba3bf437b10c356b0a36d82e9c6c2918`
- CI run: `33557623651` — passed every quality gate
- Protected staging run: `33557623603` — passed every deployment and live-verification gate
- Sanitized artifact: `9820162473`
- Artifact digest: `sha256:bd71a84aaee7821bab3edc75bebea0cc6cddecfb600bafcbaa297f24c8ae6fbe`

The deployment trigger is an audited source-equivalent commit used because the staging workflow intentionally deploys from `feature/p47-093-chatgpt-private-staging`; it does not contain source changes beyond merged main.

## Verified live boundary

The protected workflow passed:

1. governed source, data inventory, release and staging validation;
2. dependency audit, typecheck, full tests and build;
3. Cloudflare secret-binding and authority preflight;
4. deployment and exact container revision convergence;
5. twelve public-boundary checks, including closed mutation routes;
6. seventeen authenticated OAuth, role, tenancy, revocation and exact-tool checks;
7. live payload/credential/secret-redaction checks; and
8. governed rollback and exact recovery at 100% traffic.

The authenticated inventory remains exactly six read-only tools: `list_workspaces`, `list_datasets`, `list_dataset_candidates`, `get_candidate_evidence`, `compare_candidates`, and `get_decision_brief`.

## Private configuration observation — 2026-09-04

- The existing personal developer-mode ChatGPT app is installed as
  `asdk_app_6a9731fb7f0c8191a854d8d1ac1ef30d`.
- ChatGPT reports `Connection: Connect` and zero app actions before owner OAuth.
  The flow reached the deployed issuer's owner sign-in form, but the secure
  credential handoff was declined before submission. No successful connection,
  workspace, or tool-discovery claim is made.
- The accountable owner confirmed that they did not create or retain the
  bootstrap plaintext credential. The automated database principal exists, but
  owner credential control is unverified. The plaintext cannot be recovered;
  the governed next step is the exact-owner credential-recovery workflow.
- GitHub environment `chatgpt-real-data-pilot` exists as environment
  `21275904999`, permits deployment only from `main`, and has zero secrets. Its
  workflow-required secret names are `MONGODB_URI`, `CHATGPT_PILOT_EMAIL`, and
  `CHATGPT_PILOT_DATA_B64`.
- Sanitized state is recorded in
  `products/chatgpt/tax-lien-intelligence/receipts/private-configuration-20260904.json`.

## Owner identity gate

The persistent private-pilot owner gate is already closed by protected workflow run `33525658271` and sanitized receipt `receipts/pilot-provision-f80b7ac.json`. It proves exactly one persistent user, one workspace, one owner membership, no public registration, no plaintext credential processing, and shared-model training disabled by default.

## Remaining P47-093 gates

Only the following operational claims remain unproven:

1. The accountable owner must regain credential control through the protected exact-owner recovery workflow. The installed personal ChatGPT app must then complete OAuth against this staging issuer and demonstrate the exact intended workspace/tool surface. The resulting receipts must not retain credentials, tokens or email identity.
2. A market-relevant Maricopa pilot dataset needs explicit reuse rights plus provenance, source-as-of, retention, minimization and no-training attestations.
3. That dataset must enter through a separately reviewed protected owner-operated ingestion lane, never through a new public upload/mutation MCP tool.
4. The required real-data grounding, unknown, heuristic and prompt-injection cases must execute successfully.

P47-093 remains `in_progress` until those claims are evidenced. P47-094 and public release remain blocked.
