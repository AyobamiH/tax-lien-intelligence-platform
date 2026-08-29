"""Dependency-free runtime validation for the versioned engine contracts."""

from __future__ import annotations

from datetime import datetime
import math
import re
from typing import Any

ENGINE_CONTRACT_VERSION = "1.0.0"
CANDIDATE_EVIDENCE_SCHEMA_VERSION = "1.0.0"

_TIMESTAMP_PATTERN = re.compile(
    r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$"
)
_SHA256_PATTERN = re.compile(r"^[a-fA-F0-9]{64}$")
_EVIDENCE_STATES = {"observed", "derived", "unknown", "not_applicable"}
_SOURCE_TYPES = {
    "county_record",
    "assessor_record",
    "auction_record",
    "market_sale",
    "geospatial",
    "manual_verification",
}
_FIELD_NAMES = {
    "parcelId",
    "lienAmount",
    "estimatedValue",
    "propertyType",
    "roadAccess",
    "buildable",
    "utilitiesAvailable",
    "locationQuality",
}
_SIGNAL_UNITS = {
    "value_coverage_ratio": "ratio",
    "redemption_heuristic_signal": "score",
    "redemption_probability": "probability",
    "liquidity_score": "score",
    "risk_score": "score",
    "investment_score": "score",
}


def _is_record(value: Any) -> bool:
    return isinstance(value, dict)


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _is_non_empty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _is_string_array(value: Any) -> bool:
    return isinstance(value, list) and all(_is_non_empty_string(item) for item in value)


def _is_timestamp(value: Any) -> bool:
    if not isinstance(value, str) or _TIMESTAMP_PATTERN.fullmatch(value) is None:
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True


def _allowed_keys(value: dict[str, Any], allowed: set[str], path: str, errors: list[str]) -> None:
    for key in value:
        if key not in allowed:
            prefix = f"{path}." if path else ""
            errors.append(f"{prefix}{key} is not allowed.")


def _require_string(value: Any, path: str, errors: list[str]) -> None:
    if not _is_non_empty_string(value):
        errors.append(f"{path} must be a non-empty string.")


def _require_timestamp(value: Any, path: str, errors: list[str]) -> None:
    if not _is_timestamp(value):
        errors.append(f"{path} must be a canonical ISO-8601 UTC timestamp.")


def _require_string_array(value: Any, path: str, errors: list[str]) -> None:
    if not _is_string_array(value):
        errors.append(f"{path} must be an array of non-empty strings.")


def _validate_money(value: Any, path: str, errors: list[str]) -> None:
    if not _is_record(value):
        errors.append(f"{path} must be a money object.")
        return
    _allowed_keys(value, {"amount", "currency"}, path, errors)
    amount = value.get("amount")
    if not _is_number(amount) or amount < 0:
        errors.append(f"{path}.amount must be a finite non-negative number.")
    currency = value.get("currency")
    if not isinstance(currency, str) or re.fullmatch(r"[A-Z]{3}", currency) is None:
        errors.append(f"{path}.currency must be a three-letter uppercase currency code.")


def _validate_field_value(field_name: str, value: Any, path: str, errors: list[str]) -> None:
    if field_name in {"parcelId", "propertyType"}:
        _require_string(value, f"{path}.value", errors)
    elif field_name in {"lienAmount", "estimatedValue"}:
        _validate_money(value, f"{path}.value", errors)
    elif field_name in {"roadAccess", "buildable", "utilitiesAvailable"}:
        if not isinstance(value, bool):
            errors.append(f"{path}.value must be a boolean.")
    elif field_name == "locationQuality":
        if not _is_number(value) or value < 0 or value > 100:
            errors.append(f"{path}.value must be a finite number from 0 to 100.")


def _validate_evidence_field(
    value: Any,
    field_name: str,
    source_ids: set[str],
    errors: list[str],
) -> None:
    path = f"fields.{field_name}"
    if not _is_record(value):
        errors.append(f"{path} must be an evidence field object.")
        return
    _allowed_keys(value, {"state", "value", "sourceRefs", "observedAt", "derivation"}, path, errors)
    state = value.get("state")
    if state not in _EVIDENCE_STATES:
        errors.append(f"{path}.state is unsupported.")
    refs = value.get("sourceRefs")
    _require_string_array(refs, f"{path}.sourceRefs", errors)
    if isinstance(refs, list):
        for source_ref in refs:
            if isinstance(source_ref, str) and source_ref not in source_ids:
                errors.append(f"{path}.sourceRefs contains unknown source {source_ref}.")
    if "observedAt" in value:
        _require_timestamp(value.get("observedAt"), f"{path}.observedAt", errors)
    if "derivation" in value:
        _require_string(value.get("derivation"), f"{path}.derivation", errors)

    if state in {"observed", "derived"}:
        if "value" not in value:
            errors.append(f"{path}.value is required when state is {state}.")
        else:
            _validate_field_value(field_name, value.get("value"), path, errors)
        if not isinstance(refs, list) or len(refs) == 0:
            errors.append(f"{path}.sourceRefs must identify provenance when state is {state}.")
        if state == "derived" and not _is_non_empty_string(value.get("derivation")):
            errors.append(f"{path}.derivation is required when state is derived.")
    elif state in {"unknown", "not_applicable"} and "value" in value:
        errors.append(f"{path}.value must be omitted when state is {state}.")


def validate_candidate_evidence(value: Any) -> list[str]:
    """Return all CandidateEvidenceV1 validation errors without mutating input."""

    errors: list[str] = []
    if not _is_record(value):
        return ["Candidate evidence must be an object."]
    _allowed_keys(
        value,
        {
            "schemaVersion",
            "evidenceVersion",
            "requestId",
            "candidateId",
            "asOf",
            "jurisdiction",
            "provenance",
            "fields",
            "limitations",
        },
        "",
        errors,
    )
    if value.get("schemaVersion") != CANDIDATE_EVIDENCE_SCHEMA_VERSION:
        errors.append(f"schemaVersion must equal {CANDIDATE_EVIDENCE_SCHEMA_VERSION}.")
    _require_string(value.get("evidenceVersion"), "evidenceVersion", errors)
    _require_string(value.get("requestId"), "requestId", errors)
    _require_string(value.get("candidateId"), "candidateId", errors)
    _require_timestamp(value.get("asOf"), "asOf", errors)
    _require_string_array(value.get("limitations"), "limitations", errors)

    jurisdiction = value.get("jurisdiction")
    if not _is_record(jurisdiction):
        errors.append("jurisdiction must be an object.")
    else:
        _allowed_keys(jurisdiction, {"country", "state", "county"}, "jurisdiction", errors)
        for key in ("country", "state", "county"):
            _require_string(jurisdiction.get(key), f"jurisdiction.{key}", errors)

    source_ids: set[str] = set()
    provenance = value.get("provenance")
    if not isinstance(provenance, list):
        errors.append("provenance must be an array.")
    else:
        for index, source in enumerate(provenance):
            path = f"provenance[{index}]"
            if not _is_record(source):
                errors.append(f"{path} must be an evidence source object.")
                continue
            _allowed_keys(
                source,
                {
                    "sourceId",
                    "sourceType",
                    "authority",
                    "uri",
                    "retrievedAt",
                    "effectiveAt",
                    "adapterVersion",
                    "license",
                },
                path,
                errors,
            )
            source_id = source.get("sourceId")
            _require_string(source_id, f"{path}.sourceId", errors)
            if isinstance(source_id, str) and source_id.strip():
                if source_id in source_ids:
                    errors.append(f"{path}.sourceId must be unique.")
                source_ids.add(source_id)
            if source.get("sourceType") not in _SOURCE_TYPES:
                errors.append(f"{path}.sourceType is unsupported.")
            _require_string(source.get("authority"), f"{path}.authority", errors)
            _require_string(source.get("uri"), f"{path}.uri", errors)
            _require_timestamp(source.get("retrievedAt"), f"{path}.retrievedAt", errors)
            for optional_timestamp in ("effectiveAt",):
                if optional_timestamp in source:
                    _require_timestamp(source.get(optional_timestamp), f"{path}.{optional_timestamp}", errors)
            for optional_string in ("adapterVersion", "license"):
                if optional_string in source:
                    _require_string(source.get(optional_string), f"{path}.{optional_string}", errors)

    fields = value.get("fields")
    if not _is_record(fields):
        errors.append("fields must be an object.")
    else:
        _allowed_keys(fields, _FIELD_NAMES, "fields", errors)
        for field_name in sorted(_FIELD_NAMES):
            _validate_evidence_field(fields.get(field_name), field_name, source_ids, errors)
    return errors


def validate_engine_result(value: Any) -> list[str]:
    """Validate the service's EngineResultV1 output before it crosses HTTP."""

    errors: list[str] = []
    if not _is_record(value):
        return ["Engine result must be an object."]
    required_keys = {
        "contractVersion",
        "evidenceSchemaVersion",
        "requestId",
        "candidateId",
        "generatedAt",
        "status",
        "versions",
        "applicability",
        "evidenceDigest",
        "signals",
        "findings",
        "missingEvidence",
        "limitations",
    }
    _allowed_keys(value, required_keys, "", errors)
    if value.get("contractVersion") != ENGINE_CONTRACT_VERSION:
        errors.append(f"contractVersion must equal {ENGINE_CONTRACT_VERSION}.")
    if value.get("evidenceSchemaVersion") != CANDIDATE_EVIDENCE_SCHEMA_VERSION:
        errors.append(f"evidenceSchemaVersion must equal {CANDIDATE_EVIDENCE_SCHEMA_VERSION}.")
    for key in ("requestId", "candidateId"):
        _require_string(value.get(key), key, errors)
    _require_timestamp(value.get("generatedAt"), "generatedAt", errors)
    status = value.get("status")
    if status not in {"assessed", "insufficient_evidence", "out_of_scope"}:
        errors.append("status is unsupported.")
    digest = value.get("evidenceDigest")
    if not isinstance(digest, str) or _SHA256_PATTERN.fullmatch(digest) is None:
        errors.append("evidenceDigest must be a 64-character hexadecimal digest.")
    _require_string_array(value.get("missingEvidence"), "missingEvidence", errors)
    _require_string_array(value.get("limitations"), "limitations", errors)

    versions = value.get("versions")
    if not _is_record(versions):
        errors.append("versions must be an object.")
    else:
        _allowed_keys(versions, {"engineVersion", "rulePackVersion", "evidenceVersion"}, "versions", errors)
        for key in ("engineVersion", "rulePackVersion", "evidenceVersion"):
            _require_string(versions.get(key), f"versions.{key}", errors)

    applicability = value.get("applicability")
    applicability_status = None
    if not _is_record(applicability):
        errors.append("applicability must be an object.")
    else:
        _allowed_keys(
            applicability,
            {"status", "jurisdiction", "reason", "sourceRefs", "rulePackId"},
            "applicability",
            errors,
        )
        applicability_status = applicability.get("status")
        if applicability_status not in {"applicable", "unknown", "out_of_scope"}:
            errors.append("applicability.status is unsupported.")
        for key in ("jurisdiction", "reason"):
            _require_string(applicability.get(key), f"applicability.{key}", errors)
        _require_string_array(applicability.get("sourceRefs"), "applicability.sourceRefs", errors)
        if "rulePackId" in applicability:
            _require_string(applicability.get("rulePackId"), "applicability.rulePackId", errors)

    signals = value.get("signals")
    available_signal = False
    signal_keys: set[str] = set()
    if not isinstance(signals, list):
        errors.append("signals must be an array.")
    else:
        for index, signal in enumerate(signals):
            path = f"signals[{index}]"
            if not _is_record(signal):
                errors.append(f"{path} must be an engine signal object.")
                continue
            _allowed_keys(
                signal,
                {
                    "key",
                    "status",
                    "method",
                    "unit",
                    "value",
                    "evidenceRefs",
                    "explanation",
                    "missingEvidence",
                    "modelArtifact",
                },
                path,
                errors,
            )
            key = signal.get("key")
            signal_status = signal.get("status")
            method = signal.get("method")
            unit = signal.get("unit")
            if key not in _SIGNAL_UNITS:
                errors.append(f"{path}.key is unsupported.")
            elif unit != _SIGNAL_UNITS[key]:
                errors.append(f"{path}.unit must be {_SIGNAL_UNITS[key]} for {key}.")
            if isinstance(key, str):
                if key in signal_keys:
                    errors.append(f"{path}.key must be unique.")
                signal_keys.add(key)
            if signal_status not in {"available", "unknown", "unavailable", "not_applicable"}:
                errors.append(f"{path}.status is unsupported.")
            if method not in {"deterministic", "heuristic", "model", "not_computed"}:
                errors.append(f"{path}.method is unsupported.")
            _require_string_array(signal.get("evidenceRefs"), f"{path}.evidenceRefs", errors)
            _require_string(signal.get("explanation"), f"{path}.explanation", errors)
            _require_string_array(signal.get("missingEvidence"), f"{path}.missingEvidence", errors)
            if signal_status == "available":
                available_signal = True
                number = signal.get("value")
                if not _is_number(number):
                    errors.append(f"{path}.value must be a finite number when status is available.")
                if method == "not_computed":
                    errors.append(f"{path}.method cannot be not_computed when status is available.")
                if unit == "probability" and _is_number(number) and not 0 <= number <= 1:
                    errors.append(f"{path}.value must be between 0 and 1 for a probability.")
                if unit == "score" and _is_number(number) and not 0 <= number <= 100:
                    errors.append(f"{path}.value must be between 0 and 100 for a score.")
                if unit == "ratio" and _is_number(number) and number < 0:
                    errors.append(f"{path}.value must be non-negative for a ratio.")
            else:
                if "value" in signal:
                    errors.append(f"{path}.value must be omitted when status is {signal_status}.")
                if method != "not_computed":
                    errors.append(f"{path}.method must be not_computed when status is {signal_status}.")
            artifact = signal.get("modelArtifact")
            if method == "model":
                if not _is_record(artifact):
                    errors.append(f"{path}.modelArtifact must be a model artifact reference.")
            elif "modelArtifact" in signal:
                errors.append(f"{path}.modelArtifact is only allowed for model signals.")
            if key == "redemption_probability" and signal_status == "available" and method != "model":
                errors.append(
                    f"{path} redemption_probability must be produced by a versioned model artifact."
                )
            if key == "redemption_heuristic_signal" and signal_status == "available" and method != "heuristic":
                errors.append(f"{path} redemption_heuristic_signal must use the heuristic method.")

    findings = value.get("findings")
    if not isinstance(findings, list):
        errors.append("findings must be an array.")
    else:
        for index, finding in enumerate(findings):
            path = f"findings[{index}]"
            if not _is_record(finding):
                errors.append(f"{path} must be an engine finding object.")
                continue
            _allowed_keys(finding, {"code", "severity", "message", "evidenceRefs", "ruleId"}, path, errors)
            _require_string(finding.get("code"), f"{path}.code", errors)
            if finding.get("severity") not in {"info", "warning", "exclusion"}:
                errors.append(f"{path}.severity is unsupported.")
            _require_string(finding.get("message"), f"{path}.message", errors)
            _require_string_array(finding.get("evidenceRefs"), f"{path}.evidenceRefs", errors)
            if "ruleId" in finding:
                _require_string(finding.get("ruleId"), f"{path}.ruleId", errors)

    if status == "assessed" and applicability_status != "applicable":
        errors.append("assessed results require applicable applicability.")
    if status == "assessed" and not available_signal:
        errors.append("assessed results must contain at least one available signal.")
    if status == "out_of_scope" and applicability_status != "out_of_scope":
        errors.append("out_of_scope results require out_of_scope applicability.")
    return errors
