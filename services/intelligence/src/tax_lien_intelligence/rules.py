"""Deterministic jurisdiction evaluation with no model placeholders."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import struct
from typing import Any

from .contracts import (
    CANDIDATE_EVIDENCE_SCHEMA_VERSION,
    ENGINE_CONTRACT_VERSION,
    validate_candidate_evidence,
    validate_engine_result,
)

RULE_ENGINE_VERSION = "jurisdiction-rules-1.1.0"
RULE_PACK_ID = "us-az-maricopa-statutory-baseline"
RULE_PACK_VERSION = "2026-08-29.1"
RULE_PACK_VERIFIED_AT = "2026-08-29T09:15:00.000Z"
SERVICE_VERSION = "0.1.0"

STATUTORY_SOURCES = [
    {
        "citationId": "ars-42-18101",
        "authority": "Arizona State Legislature",
        "section": "A.R.S. 42-18101",
        "uri": "https://www.azleg.gov/ars/42/18101.htm",
    },
    {
        "citationId": "ars-42-18114",
        "authority": "Arizona State Legislature",
        "section": "A.R.S. 42-18114",
        "uri": "https://www.azleg.gov/ars/42/18114.htm",
    },
    {
        "citationId": "ars-42-18053",
        "authority": "Arizona State Legislature",
        "section": "A.R.S. 42-18053",
        "uri": "https://www.azleg.gov/ars/42/18053.htm",
    },
    {
        "citationId": "ars-42-18115",
        "authority": "Arizona State Legislature",
        "section": "A.R.S. 42-18115",
        "uri": "https://www.azleg.gov/ars/42/18115.htm",
    },
    {
        "citationId": "ars-42-18118",
        "authority": "Arizona State Legislature",
        "section": "A.R.S. 42-18118",
        "uri": "https://www.azleg.gov/ars/42/18118.htm",
    },
    {
        "citationId": "ars-42-18127",
        "authority": "Arizona State Legislature",
        "section": "A.R.S. 42-18127",
        "uri": "https://www.azleg.gov/ars/42/18127.htm",
    },
    {
        "citationId": "ars-42-18152",
        "authority": "Arizona State Legislature",
        "section": "A.R.S. 42-18152",
        "uri": "https://www.azleg.gov/ars/42/18152.htm",
    },
    {
        "citationId": "ars-42-18201",
        "authority": "Arizona State Legislature",
        "section": "A.R.S. 42-18201",
        "uri": "https://www.azleg.gov/ars/42/18201.htm",
    },
    {
        "citationId": "ars-42-18202",
        "authority": "Arizona State Legislature",
        "section": "A.R.S. 42-18202",
        "uri": "https://www.azleg.gov/ars/42/18202.htm",
    },
]

_DISCLOSURE_FINDINGS = [
    {
        "code": "az.instrument.tax-lien-certificate",
        "severity": "info",
        "message": (
            "The sale concerns a real-property tax lien evidenced by a certificate of purchase, "
            "not an immediate conveyance of the parcel."
        ),
        "evidenceRefs": [],
        "ruleId": "az.instrument.tax-lien-certificate",
    },
    {
        "code": "az.redemption.remains-open-until-deed",
        "severity": "warning",
        "message": (
            "Arizona law permits full redemption within three years after sale and after three "
            "years until delivery of a treasurer's deed."
        ),
        "evidenceRefs": [],
        "ruleId": "az.redemption.remains-open-until-deed",
    },
    {
        "code": "az.foreclosure.window",
        "severity": "warning",
        "message": (
            "Subject to statutory exceptions, a purchaser may bring a redemption-foreclosure "
            "action beginning three years after sale and the certificate may expire if action "
            "is not commenced within the statutory ten-year period."
        ),
        "evidenceRefs": [],
        "ruleId": "az.foreclosure.window",
    },
    {
        "code": "az.foreclosure.notice",
        "severity": "warning",
        "message": (
            "A certificate holder must satisfy the statutory notice requirements before a court "
            "may enter a foreclosure judgment."
        ),
        "evidenceRefs": [],
        "ruleId": "az.foreclosure.notice",
    },
    {
        "code": "az.bid.rate-mechanics",
        "severity": "info",
        "message": (
            "The successful purchaser offers the lowest redemption interest rate, and that rate "
            "may not exceed the rate prescribed for delinquent taxes."
        ),
        "evidenceRefs": [],
        "ruleId": "az.bid.rate-mechanics",
    },
    {
        "code": "az.encumbrances.survive-sale",
        "severity": "warning",
        "message": (
            "A tax-lien sale does not extinguish easements or the assessment liens identified "
            "by Arizona statute."
        ),
        "evidenceRefs": [],
        "ruleId": "az.encumbrances.survive-sale",
    },
]

_LIMITATIONS = [
    "This pack encodes an Arizona statutory baseline and internal review policy, not legal advice.",
    (
        "Current Maricopa County auction registration, deposit, payment, schedule, and platform "
        "rules are not verified in this pack."
    ),
    (
        "The pack does not determine title condition, bankruptcy status, environmental condition, "
        "occupancy, or bid eligibility."
    ),
]


class EvidenceValidationError(ValueError):
    """Raised when candidate evidence does not satisfy CandidateEvidenceV1."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__("Candidate evidence failed validation.")
        self.errors = errors


class EngineContractError(RuntimeError):
    """Raised before invalid service output can cross the HTTP boundary."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__("Generated engine result violated EngineResultV1.")
        self.errors = errors


def canonical_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _canonical_encoding(value: Any) -> str:
    if value is None:
        return "n"
    if isinstance(value, bool):
        return "b1" if value else "b0"
    if isinstance(value, (int, float)):
        return f"d{struct.pack('>d', float(value)).hex()}"
    if isinstance(value, str):
        return f"s{value.encode('utf-8').hex()}"
    if isinstance(value, list):
        return f"a[{','.join(_canonical_encoding(item) for item in value)}]"
    if isinstance(value, dict):
        encoded_items = [
            (str(key).encode("utf-8").hex(), item)
            for key, item in value.items()
            if item is not None
        ]
        encoded_items.sort(key=lambda pair: pair[0])
        return "o{" + ",".join(
            f"{encoded_key}:{_canonical_encoding(item)}" for encoded_key, item in encoded_items
        ) + "}"
    raise TypeError(f"Unsupported evidence value type: {type(value).__name__}")


def digest_candidate_evidence(evidence: dict[str, Any]) -> str:
    return hashlib.sha256(_canonical_encoding(evidence).encode("utf-8")).hexdigest()


def _normalized_token(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _is_supported_jurisdiction(jurisdiction: dict[str, str]) -> bool:
    country = _normalized_token(jurisdiction["country"])
    state = _normalized_token(jurisdiction["state"])
    county = _normalized_token(jurisdiction["county"])
    if county.endswith(" county"):
        county = county[:-7]
    return (
        country in {"us", "usa", "united states"}
        and state in {"az", "arizona"}
        and county == "maricopa"
    )


def _jurisdiction_label(evidence: dict[str, Any]) -> str:
    jurisdiction = evidence["jurisdiction"]
    return "/".join(
        jurisdiction[key].strip() for key in ("country", "state", "county")
    )


def _field_value(field: dict[str, Any]) -> Any | None:
    if field["state"] not in {"observed", "derived"}:
        return None
    return field.get("value")


def _evidence_refs(*fields: dict[str, Any]) -> list[str]:
    result: list[str] = []
    for field in fields:
        for source_ref in field["sourceRefs"]:
            if source_ref not in result:
                result.append(source_ref)
    return result


def _unavailable_redemption_probability() -> dict[str, Any]:
    return {
        "key": "redemption_probability",
        "status": "unavailable",
        "method": "not_computed",
        "unit": "probability",
        "evidenceRefs": [],
        "explanation": (
            "No trained, evaluated, and versioned redemption model artifact is registered for "
            "this rule pack."
        ),
        "missingEvidence": [
            "verified historical redemption outcomes",
            "promoted redemption model artifact",
        ],
    }


def _validated_result(result: dict[str, Any]) -> dict[str, Any]:
    errors = validate_engine_result(result)
    if errors:
        raise EngineContractError(errors)
    return result


def _out_of_scope(evidence: dict[str, Any], generated_at: str) -> dict[str, Any]:
    return _validated_result(
        {
            "contractVersion": ENGINE_CONTRACT_VERSION,
            "evidenceSchemaVersion": CANDIDATE_EVIDENCE_SCHEMA_VERSION,
            "requestId": evidence["requestId"],
            "candidateId": evidence["candidateId"],
            "generatedAt": generated_at,
            "status": "out_of_scope",
            "versions": {
                "engineVersion": RULE_ENGINE_VERSION,
                "rulePackVersion": "unavailable",
                "evidenceVersion": evidence["evidenceVersion"],
            },
            "applicability": {
                "status": "out_of_scope",
                "jurisdiction": _jurisdiction_label(evidence),
                "reason": "No verified jurisdiction rule pack matches this candidate.",
                "sourceRefs": [],
            },
            "evidenceDigest": digest_candidate_evidence(evidence),
            "signals": [
                {
                    "key": "redemption_probability",
                    "status": "not_applicable",
                    "method": "not_computed",
                    "unit": "probability",
                    "evidenceRefs": [],
                    "explanation": (
                        "No model output is produced outside a verified jurisdiction rule pack."
                    ),
                    "missingEvidence": ["verified jurisdiction rule pack"],
                }
            ],
            "findings": [],
            "missingEvidence": ["verified jurisdiction rule pack"],
            "limitations": [
                "The engine did not evaluate this candidate outside its verified jurisdiction scope."
            ],
        }
    )


def _evaluate_supported(evidence: dict[str, Any], generated_at: str) -> dict[str, Any]:
    fields = evidence["fields"]
    parcel_id = _field_value(fields["parcelId"])
    lien_amount = _field_value(fields["lienAmount"])
    estimated_value = _field_value(fields["estimatedValue"])
    road_access = _field_value(fields["roadAccess"])
    missing_core: list[str] = []
    if parcel_id is None:
        missing_core.append("parcel identifier")
    if lien_amount is None or lien_amount["amount"] <= 0:
        missing_core.append("positive lien amount")
    if estimated_value is None:
        missing_core.append("supported property value")
    if (
        lien_amount is not None
        and estimated_value is not None
        and lien_amount["currency"] != estimated_value["currency"]
    ):
        missing_core.append("lien and value amounts in a common currency")

    findings = [dict(finding) for finding in _DISCLOSURE_FINDINGS]
    signals: list[dict[str, Any]] = []
    value_coverage: float | None = None
    if (
        lien_amount is not None
        and lien_amount["amount"] > 0
        and estimated_value is not None
        and lien_amount["currency"] == estimated_value["currency"]
    ):
        value_coverage = estimated_value["amount"] / lien_amount["amount"]
        signals.append(
            {
                "key": "value_coverage_ratio",
                "status": "available",
                "method": "deterministic",
                "unit": "ratio",
                "value": value_coverage,
                "evidenceRefs": _evidence_refs(fields["lienAmount"], fields["estimatedValue"]),
                "explanation": "Known property value divided by known lien amount.",
                "missingEvidence": [],
            }
        )
    else:
        signals.append(
            {
                "key": "value_coverage_ratio",
                "status": "unknown",
                "method": "not_computed",
                "unit": "ratio",
                "evidenceRefs": _evidence_refs(fields["lienAmount"], fields["estimatedValue"]),
                "explanation": (
                    "Value coverage requires positive lien amount and comparable property value."
                ),
                "missingEvidence": [item for item in missing_core if item != "parcel identifier"],
            }
        )
    signals.append(_unavailable_redemption_probability())

    if value_coverage is not None and value_coverage < 1:
        findings.append(
            {
                "code": "platform.value-coverage.below-one",
                "severity": "exclusion",
                "message": (
                    "Internal review policy excludes a candidate when known value does not cover "
                    "the lien amount."
                ),
                "evidenceRefs": _evidence_refs(fields["lienAmount"], fields["estimatedValue"]),
                "ruleId": "platform.value-coverage.below-one",
            }
        )
    if road_access is False:
        findings.append(
            {
                "code": "platform.access.none-observed",
                "severity": "exclusion",
                "message": (
                    "Internal review policy excludes a candidate when available evidence "
                    "establishes no road access."
                ),
                "evidenceRefs": list(fields["roadAccess"]["sourceRefs"]),
                "ruleId": "platform.access.none-observed",
            }
        )

    additional_missing = []
    if road_access is None:
        additional_missing.append("road access")
    if fields["buildable"]["state"] == "unknown":
        additional_missing.append("buildability")
    if fields["utilitiesAvailable"]["state"] == "unknown":
        additional_missing.append("utility availability")
    missing_evidence: list[str] = []
    for item in [
        *missing_core,
        *additional_missing,
        "verified historical redemption outcomes",
        "promoted redemption model artifact",
    ]:
        if item not in missing_evidence:
            missing_evidence.append(item)

    return _validated_result(
        {
            "contractVersion": ENGINE_CONTRACT_VERSION,
            "evidenceSchemaVersion": CANDIDATE_EVIDENCE_SCHEMA_VERSION,
            "requestId": evidence["requestId"],
            "candidateId": evidence["candidateId"],
            "generatedAt": generated_at,
            "status": "assessed" if not missing_core else "insufficient_evidence",
            "versions": {
                "engineVersion": RULE_ENGINE_VERSION,
                "rulePackVersion": RULE_PACK_VERSION,
                "evidenceVersion": evidence["evidenceVersion"],
            },
            "applicability": {
                "status": "applicable",
                "jurisdiction": _jurisdiction_label(evidence),
                "reason": (
                    "A primary-source-verified Arizona statutory baseline is registered for "
                    "Maricopa County."
                ),
                "sourceRefs": [],
                "rulePackId": RULE_PACK_ID,
            },
            "evidenceDigest": digest_candidate_evidence(evidence),
            "signals": signals,
            "findings": findings,
            "missingEvidence": missing_evidence,
            "limitations": list(_LIMITATIONS),
        }
    )


def evaluate_candidate(
    evidence: dict[str, Any],
    generated_at: str | None = None,
) -> dict[str, Any]:
    errors = validate_candidate_evidence(evidence)
    if errors:
        raise EvidenceValidationError(errors)
    evaluation_time = generated_at or canonical_timestamp()
    if _is_supported_jurisdiction(evidence["jurisdiction"]):
        return _evaluate_supported(evidence, evaluation_time)
    return _out_of_scope(evidence, evaluation_time)


def version_manifest() -> dict[str, Any]:
    return {
        "service": "tax-lien-intelligence",
        "serviceVersion": SERVICE_VERSION,
        "contractVersion": ENGINE_CONTRACT_VERSION,
        "evidenceSchemaVersion": CANDIDATE_EVIDENCE_SCHEMA_VERSION,
        "engineVersion": RULE_ENGINE_VERSION,
        "rulePacks": [
            {
                "packId": RULE_PACK_ID,
                "version": RULE_PACK_VERSION,
                "verifiedAt": RULE_PACK_VERIFIED_AT,
                "jurisdiction": {"country": "US", "state": "AZ", "county": "Maricopa"},
                "operationalAuctionRulesStatus": "not_verified",
                "sources": STATUTORY_SOURCES,
            }
        ],
        "modelArtifacts": [],
    }
