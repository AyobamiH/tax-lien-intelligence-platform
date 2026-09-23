---
schema: clawsweeper.project-vision.v1
project_id: tax-lien-intelligence-platform
repository: AyobamiH/tax-lien-intelligence-platform
---

# Project Vision

## Identity

Tax Lien Intelligence Platform is the canonical multi-tenant engine and system of record for evidence-first tax-lien and parcel investment decision support.

## Purpose

Turn messy county data into structured, explainable workflows for ingestion, readiness repair, enrichment, scoring, review, comparison, approval, decision briefs, outcomes, and retrospectives without presenting uncertain data as investment truth.

## Owns

- Dataset ingestion, mapping, readiness, profiles, scoring, enrichment, and evidence state.
- Workspace tenancy, review workflow, collaboration context, and decision records.
- The deterministic intelligence engine, rule/evidence versions, provenance, and system-of-record data.
- The canonical interface consumed by the thin ChatGPT product.

## Does Not Own

- Legal, tax, or financial advice.
- Automated bidding, purchasing, foreclosure, or guaranteed-return decisions.
- A replacement engine inside the ChatGPT release surface.
- Broad county scraping or a public data marketplace merely because county inputs exist.

## Non-Negotiable Invariants

- The existing platform remains engine, tenant authority, evidence store, and system of record.
- Unsupported or weak inputs return insufficient-evidence/out-of-scope states instead of fabricated predictions.
- Language models do not invent or alter deterministic engine values.
- Numeric claims retain rule/model/evidence provenance and version identity.
- Workspace membership is resolved server-side; caller-supplied tenant identity is not trusted.
- Stored facts, fixed-rule inference, model output, and unknowns remain visibly distinct.
- ChatGPT remains read-only decision support unless an explicit later authority decision changes the boundary.

## Evidence of Done

A decision-support feature is done only when implementation, tests, documentation, provenance, tenancy boundaries, and required runtime evidence agree. A model output without evidence lineage is not completion.

## Relationships

- products/chatgpt: thin release surface consuming this platform; not a parallel engine.
- OpenClaw: orchestration environment, not the product system of record.

## Canonical Sources

MISSION.md, ACCEPTANCE.md, AGENTS.md, OPENCLAW_RUNBOOK.md, WORK_LEDGER.md, docs/README.md, docs/engine/README.md, and docs/engine/work-graph.json.

## Agent Rule

Read MISSION.md and ACCEPTANCE.md after this brief. Never duplicate engine, tenancy, evidence, or write logic into a conversational surface.
