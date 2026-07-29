"""
PayParity — Labor Law Compliance Knowledge Base
Mock knowledge base with labor privacy law rules and compliance checks.
Production: replace with real legal data + vector search.
"""
from __future__ import annotations

from typing import List, Optional
import structlog

logger = structlog.get_logger(__name__)


COMPLIANCE_RULES = [
    {
        "id": "EEOC-001",
        "jurisdiction": "US-Federal",
        "statute": "Equal Pay Act (1963)",
        "requirement": "Equal pay for equal work regardless of sex",
        "relevance": "gender",
        "max_adjustment_pct": None,
        "requires_documentation": True,
    },
    {
        "id": "EEOC-002",
        "jurisdiction": "US-Federal",
        "statute": "Title VII Civil Rights Act (1964)",
        "requirement": "No discrimination in compensation based on race, color, religion, sex, national origin",
        "relevance": "all",
        "max_adjustment_pct": None,
        "requires_documentation": True,
    },
    {
        "id": "NLRA-001",
        "jurisdiction": "US-Federal",
        "statute": "National Labor Relations Act",
        "requirement": "Employees have right to discuss wages",
        "relevance": "transparency",
        "max_adjustment_pct": None,
        "requires_documentation": False,
    },
    {
        "id": "GDPR-001",
        "jurisdiction": "EU",
        "statute": "GDPR Article 9",
        "requirement": "Sensitive personal data (incl. ethnic origin) requires explicit consent for processing",
        "relevance": "privacy",
        "max_adjustment_pct": None,
        "requires_documentation": True,
    },
    {
        "id": "UK-EA-001",
        "jurisdiction": "UK",
        "statute": "Equality Act (2010)",
        "requirement": "Mandatory gender pay gap reporting for employers with 250+ employees",
        "relevance": "gender",
        "max_adjustment_pct": None,
        "requires_documentation": True,
    },
    {
        "id": "CA-FEHA-001",
        "jurisdiction": "US-CA",
        "statute": "CA Fair Employment and Housing Act",
        "requirement": "No pay discrimination; requires pay scale disclosure upon request",
        "relevance": "gender",
        "max_adjustment_pct": None,
        "requires_documentation": True,
    },
]


class ComplianceKnowledgeBase:
    """Labor law compliance rule checker."""

    def __init__(self):
        self.rules = COMPLIANCE_RULES

    def check_recommendation(
        self,
        dimension: str,
        adjustment_pct: float,
        jurisdiction: str = "US-Federal",
    ) -> str:
        """
        Check a proposed equity adjustment against compliance rules.
        Returns a compliance note string.
        """
        relevant_rules = [
            r for r in self.rules
            if jurisdiction in r["jurisdiction"] or r["jurisdiction"] == "US-Federal"
        ]

        notes = []
        for rule in relevant_rules:
            if dimension in ["gender", "gender_group"] and "gender" in rule["relevance"]:
                notes.append(
                    f"Compliant with {rule['statute']} ({rule['jurisdiction']}). "
                    f"Documentation required: {rule['requires_documentation']}."
                )
            elif rule["relevance"] == "all":
                notes.append(
                    f"Review against {rule['statute']} ({rule['jurisdiction']})."
                )

        if adjustment_pct > 15.0:
            notes.append(
                "NOTE: Adjustments >15% may require additional legal review "
                "and executive sign-off beyond standard HITL process."
            )

        return " | ".join(notes) if notes else "No specific compliance concerns identified for this adjustment."

    def get_privacy_obligations(self, jurisdiction: str = "US-Federal") -> List[dict]:
        """Return privacy-relevant rules for the given jurisdiction."""
        return [
            r for r in self.rules
            if r["relevance"] == "privacy" or "privacy" in r.get("statute", "").lower()
        ]

    def get_all_applicable_rules(self, dimension: str) -> List[dict]:
        return [r for r in self.rules if r["relevance"] in [dimension, "all"]]
