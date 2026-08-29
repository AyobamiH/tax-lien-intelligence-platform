from __future__ import annotations

from copy import deepcopy
import unittest

from tax_lien_intelligence.contracts import validate_candidate_evidence, validate_engine_result
from tax_lien_intelligence.rules import (
    EvidenceValidationError,
    digest_candidate_evidence,
    evaluate_candidate,
    version_manifest,
)


TIMESTAMP = "2026-08-29T10:00:00.000Z"
COUNTY_SOURCE = "python-vector:county"
ASSESSOR_SOURCE = "python-vector:assessor"


def unknown_field() -> dict:
    return {"state": "unknown", "sourceRefs": []}


def evidence_vector() -> dict:
    return {
        "schemaVersion": "1.0.0",
        "evidenceVersion": "python-service-vector-v1",
        "requestId": "request-python-001",
        "candidateId": "candidate-python-001",
        "asOf": TIMESTAMP,
        "jurisdiction": {"country": "US", "state": "AZ", "county": "Maricopa"},
        "provenance": [
            {
                "sourceId": COUNTY_SOURCE,
                "sourceType": "county_record",
                "authority": "Deterministic service contract vector",
                "uri": "urn:tax-lien:python-test:county",
                "retrievedAt": TIMESTAMP,
            },
            {
                "sourceId": ASSESSOR_SOURCE,
                "sourceType": "assessor_record",
                "authority": "Deterministic service contract vector",
                "uri": "urn:tax-lien:python-test:assessor",
                "retrievedAt": TIMESTAMP,
            },
        ],
        "fields": {
            "parcelId": {
                "state": "observed",
                "value": "TEST-PARCEL-PYTHON",
                "sourceRefs": [COUNTY_SOURCE],
                "observedAt": TIMESTAMP,
            },
            "lienAmount": {
                "state": "observed",
                "value": {"amount": 1000, "currency": "USD"},
                "sourceRefs": [COUNTY_SOURCE],
                "observedAt": TIMESTAMP,
            },
            "estimatedValue": {
                "state": "observed",
                "value": {"amount": 12000, "currency": "USD"},
                "sourceRefs": [ASSESSOR_SOURCE],
                "observedAt": TIMESTAMP,
            },
            "propertyType": unknown_field(),
            "roadAccess": unknown_field(),
            "buildable": unknown_field(),
            "utilitiesAvailable": unknown_field(),
            "locationQuality": unknown_field(),
        },
        "limitations": ["Deterministic contract vector only; not production intelligence."],
    }


class CandidateContractTests(unittest.TestCase):
    def test_accepts_provenance_and_explicit_unknowns(self) -> None:
        self.assertEqual(validate_candidate_evidence(evidence_vector()), [])

    def test_rejects_observed_value_without_provenance(self) -> None:
        evidence = evidence_vector()
        evidence["fields"]["parcelId"]["sourceRefs"] = []
        errors = validate_candidate_evidence(evidence)
        self.assertIn(
            "fields.parcelId.sourceRefs must identify provenance when state is observed.",
            errors,
        )

    def test_rejects_unknown_properties(self) -> None:
        evidence = evidence_vector()
        evidence["fabricatedScore"] = 99
        self.assertIn("fabricatedScore is not allowed.", validate_candidate_evidence(evidence))


class RuleEvaluationTests(unittest.TestCase):
    def test_assesses_only_deterministic_coverage(self) -> None:
        result = evaluate_candidate(evidence_vector(), generated_at=TIMESTAMP)
        self.assertEqual(result["status"], "assessed")
        coverage = next(signal for signal in result["signals"] if signal["key"] == "value_coverage_ratio")
        self.assertEqual(coverage["value"], 12)
        self.assertEqual(coverage["method"], "deterministic")
        redemption = next(
            signal for signal in result["signals"] if signal["key"] == "redemption_probability"
        )
        self.assertEqual(redemption["status"], "unavailable")
        self.assertNotIn("value", redemption)
        self.assertEqual(validate_engine_result(result), [])

    def test_abstains_when_value_is_unknown(self) -> None:
        evidence = evidence_vector()
        evidence["fields"]["estimatedValue"] = unknown_field()
        result = evaluate_candidate(evidence, generated_at=TIMESTAMP)
        self.assertEqual(result["status"], "insufficient_evidence")
        self.assertIn("supported property value", result["missingEvidence"])

    def test_returns_out_of_scope_for_unregistered_county(self) -> None:
        evidence = evidence_vector()
        evidence["jurisdiction"]["county"] = "Pima"
        result = evaluate_candidate(evidence, generated_at=TIMESTAMP)
        self.assertEqual(result["status"], "out_of_scope")
        self.assertEqual(result["versions"]["rulePackVersion"], "unavailable")
        self.assertNotIn("value", result["signals"][0])

    def test_rejects_invalid_evidence_before_rule_evaluation(self) -> None:
        evidence = evidence_vector()
        evidence["fields"]["parcelId"] = {"state": "unknown", "sourceRefs": [], "value": "invented"}
        with self.assertRaises(EvidenceValidationError):
            evaluate_candidate(evidence, generated_at=TIMESTAMP)

    def test_digest_is_stable_across_key_order_and_fractional_numbers(self) -> None:
        evidence = evidence_vector()
        evidence["fields"]["lienAmount"]["value"]["amount"] = 1000.25
        reordered = {key: evidence[key] for key in reversed(list(evidence.keys()))}
        self.assertEqual(digest_candidate_evidence(evidence), digest_candidate_evidence(reordered))
        self.assertRegex(digest_candidate_evidence(evidence), r"^[a-f0-9]{64}$")

    def test_result_validator_rejects_unavailable_values(self) -> None:
        result = evaluate_candidate(evidence_vector(), generated_at=TIMESTAMP)
        changed = deepcopy(result)
        redemption = next(
            signal for signal in changed["signals"] if signal["key"] == "redemption_probability"
        )
        redemption["value"] = 0.8
        self.assertIn(
            "signals[1].value must be omitted when status is unavailable.",
            validate_engine_result(changed),
        )

    def test_version_manifest_advertises_no_model_artifacts(self) -> None:
        manifest = version_manifest()
        self.assertEqual(manifest["modelArtifacts"], [])
        self.assertEqual(
            manifest["rulePacks"][0]["operationalAuctionRulesStatus"],
            "not_verified",
        )


if __name__ == "__main__":
    unittest.main()
