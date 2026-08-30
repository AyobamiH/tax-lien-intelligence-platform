# Decision 0003: Thin ChatGPT Product Boundary

## Status

Accepted for the priority-one release plan. Runtime implementation and public
release remain subject to their graph gates and permission boundaries.

## Context

The platform repository already owns authentication, workspace tenancy,
datasets, deterministic scoring compatibility, versioned intelligence results,
evidence provenance, and six read-only MCP tools. Turning the repository into a
public ChatGPT product requires connector-specific release metadata,
onboarding, deployment provenance, evaluations, and submission artifacts.

Combining those release concerns with engine work would make it easy to copy
logic, widen permissions, or let public-product deadlines distort the system of
record. Building a second application or engine would create the same drift in
the opposite direction.

## Decision

Keep `AyobamiH/tax-lien-intelligence-platform` as the engine, tenant authority,
evidence store, and system of record.

Plan a separate thin release repository,
`AyobamiH/tax-lien-chatgpt-product`, for ChatGPT-specific connector
configuration, onboarding, policy/listing material, evaluation manifests, and
deployment provenance.

The release product must:

- consume a pinned version of the platform's public MCP/API contract;
- contain no copied scoring, jurisdiction-rule, model, evidence-persistence,
  workspace-membership, or bid logic;
- expose only the approved read-only tools;
- link users to the authenticated platform for uploads and mutations;
- fail closed when auth, tenant resolution, evidence, or engine state is
  unavailable;
- record the exact engine and interface version used for every release;
- keep secrets, production configuration, and user evidence out of git.

The repository name is proposed and does not assert that the repository has
already been created. Until repository creation is available, the canonical
thin source package lives at
`products/chatgpt/tax-lien-intelligence` in this system-of-record repository.
It remains structurally separate, carries provenance, and may be extracted
without copying runtime or engine logic.

## Consequences

- The ChatGPT release can have its own review and rollback cadence without
  forking core product truth.
- The engine remains usable by the existing web application and future
  clients through one versioned contract.
- Any connector change that requires engine behavior returns to this
  repository as a graph node with evidence, rather than being implemented as a
  duplicate.
- Two repositories increase release coordination, so the release repository
  must carry an engine provenance manifest and compatibility gate.

## Rejected Alternatives

- Put public connector metadata and release state directly into the engine
  repository. This couples public-product release cadence to engine delivery.
- Build a separate ChatGPT backend or duplicate the engine. This creates two
  sources of truth and violates the no-drift requirement.
- Allow ChatGPT write or bid tools for convenience. This crosses the current
  safety, tenancy, and product boundary without user evidence or approval.
