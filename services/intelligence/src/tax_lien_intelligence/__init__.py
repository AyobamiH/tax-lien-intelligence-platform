"""Evidence-first tax lien intelligence service."""

from .contracts import (
    CANDIDATE_EVIDENCE_SCHEMA_VERSION,
    ENGINE_CONTRACT_VERSION,
    validate_candidate_evidence,
    validate_engine_result,
)
from .rules import RULE_ENGINE_VERSION, evaluate_candidate

__all__ = [
    "CANDIDATE_EVIDENCE_SCHEMA_VERSION",
    "ENGINE_CONTRACT_VERSION",
    "RULE_ENGINE_VERSION",
    "evaluate_candidate",
    "validate_candidate_evidence",
    "validate_engine_result",
]
