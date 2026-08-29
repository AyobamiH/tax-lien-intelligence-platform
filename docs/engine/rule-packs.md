# Jurisdiction Rule Packs

`packages/jurisdiction-rules` is the deterministic legal-context and internal
review-policy boundary for the intelligence engine. It does not call an LLM,
scrape live auctions, predict outcomes, or make legal conclusions.

## Current Registry

| Pack | Version | Scope | Legal source status | County auction status |
| --- | --- | --- | --- | --- |
| `us-az-maricopa-statutory-baseline` | `2026-08-29.1` | US / Arizona / Maricopa | Primary statutes verified on 2026-08-29 | Not verified |

The registry uses normalized aliases for `US`, `Arizona`, and `Maricopa County`,
but does not broaden coverage to another county or state. A candidate outside
the exact registered scope returns `out_of_scope` and no calculated
intelligence.

## Source Classes

Every rule declares one category and resolves to one or more citations:

- `official_statute`: current Arizona Legislature text verified on the pack's
  review date;
- `official_county`: an official county operating source, once separately
  verified;
- `internal_policy`: a Tax Lien Intelligence Platform review threshold that is
  not law.

Statutory context and internal underwriting policy are deliberately separate.
A consumer must never present an internal exclusion as a legal prohibition.

## Primary Statutory Sources

The current Arizona baseline was verified against these primary sources:

| Source | Rule context |
| --- | --- |
| [A.R.S. 42-18101](https://www.azleg.gov/ars/42/18101.htm) | Sale and foreclosure of real-property tax liens |
| [A.R.S. 42-18114](https://www.azleg.gov/ars/42/18114.htm) | Successful purchaser and bid-rate mechanics |
| [A.R.S. 42-18053](https://www.azleg.gov/ars/42/18053.htm) | Prescribed delinquent-tax interest rate |
| [A.R.S. 42-18115](https://www.azleg.gov/ars/42/18115.htm) | Easements and specified assessment liens survive sale |
| [A.R.S. 42-18118](https://www.azleg.gov/ars/42/18118.htm) | Certificate of purchase |
| [A.R.S. 42-18127](https://www.azleg.gov/ars/42/18127.htm) | Certificate expiration and statutory exceptions |
| [A.R.S. 42-18152](https://www.azleg.gov/ars/42/18152.htm) | Redemption remains possible before deed delivery |
| [A.R.S. 42-18201](https://www.azleg.gov/ars/42/18201.htm) | Redemption-foreclosure action window |
| [A.R.S. 42-18202](https://www.azleg.gov/ars/42/18202.htm) | Notice required before foreclosure action |

The pack records the authority, title, section, URL, and verification timestamp
for each citation. Rule findings carry a `ruleId`; `getRuleCitations` resolves
that identifier through the exact rule-pack version.

This is source verification, not legal advice or attorney review. Statutes can
change, so the pack is immutable and date-versioned. A later verification must
create a new pack version rather than silently changing historical output.

## Deterministic Evaluation

For a contract-valid Maricopa candidate, the current evaluator:

1. attaches the versioned Arizona statutory disclosures;
2. computes value coverage only when positive lien amount and property value
   exist in the same currency;
3. returns `insufficient_evidence` when parcel identifier, positive lien
   amount, supported value, or comparable currency is missing;
4. applies internal exclusion findings when known value coverage is below one
   or evidence establishes no road access;
5. returns redemption probability as `unavailable` because no promoted model
   artifact exists;
6. hashes canonical candidate evidence with SHA-256 and records engine,
   rule-pack, evidence, and contract versions.

The evaluator does not produce investment, risk, or liquidity scores. Adding a
numeric output requires a separately defined method, evidence requirements,
range, and promotion gate.

## Internal Underwriting Policy

The two current hard exclusions are platform review policies:

- known value coverage below `1.0`;
- observed lack of road access.

They are conservative workflow controls, not statutory requirements, title
opinions, bid instructions, or investment advice. Unknown access does not
trigger the no-access exclusion. It remains visible as missing evidence.

## Explicit Operational Gap

The current pack does not encode Maricopa County auction registration, bidder
eligibility, deposit, schedule, payment, auction-platform, or current-file
rules. Those facts require verified official county sources, update cadence,
and source licensing in `P47-060-data-inventory`. Until that happens, the pack's
`operationalAuctionRulesStatus` remains `not_verified`.

## Digest Algorithm

`digestCandidateEvidence` serializes objects with lexically sorted keys while
preserving array order and JSON primitive representation, then computes a
lowercase SHA-256 digest. This makes the same evidence content stable across
object property insertion order. The Python service must reproduce this
algorithm in cross-language parity tests before accepting traffic.
