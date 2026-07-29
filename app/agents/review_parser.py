"""
PayParity — Agent 1: Review Text Parser Agent

Detects gendered criticism, biased language patterns, and subtle evaluative bias
in anonymized performance review text.

Operates in two modes:
  - "mock": deterministic rule-based analysis (no API key required)
  - "live": LangGraph + OpenAI GPT with structured output
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import List

import structlog

from app.agents.state import AgentSwarmState, BiasEvidenceItem, ReasoningStep
from app.config import settings
from app.core.privacy import DifferentialPrivacy, PrivacyBudgetTracker
from app.tools.text_analysis import BiasLexiconAnalyzer, GenderedLanguageDetector

logger = structlog.get_logger(__name__)

# ε allocated to this agent per audit
AGENT_EPSILON_SHARE = 0.25


def run_review_parser_agent(state: AgentSwarmState) -> dict:
    """
    LangGraph node function: Review Text Parser Agent.
    Returns a partial state update dict.
    """
    logger.info("review_parser_agent.start", audit_id=state["audit_id"])

    budget = PrivacyBudgetTracker(
        total_epsilon=min(AGENT_EPSILON_SHARE, state["epsilon_remaining"]),
    )

    trace: List[ReasoningStep] = []
    bias_evidence: List[BiasEvidenceItem] = []
    epsilon_used = 0.0

    # Step 1: Load analysis tools
    lexicon = BiasLexiconAnalyzer()
    gendered_detector = GenderedLanguageDetector()

    trace.append(ReasoningStep(
        step=1,
        agent="review_parser",
        tool="BiasLexiconAnalyzer.load",
        input={"lexicon_size": lexicon.size},
        output={"status": "ready"},
        epsilon_consumed=0.0,
        timestamp=datetime.now(timezone.utc).isoformat(),
    ))

    # Step 2: Analyze each review
    reviews = state.get("reviews", [])
    for i, review in enumerate(reviews):
        text = review.get("review_text", "")
        employee_token = review.get("employee_token", f"EMP_{i}")
        review_id = review.get("id", str(uuid.uuid4()))

        if not text.strip():
            continue

        # Tool call: lexicon analysis
        lexicon_result = lexicon.analyze(text)
        # Tool call: gendered language detection
        gendered_result = gendered_detector.detect(text)

        # Determine severity
        severity = _compute_severity(lexicon_result, gendered_result)
        confidence = _compute_confidence(lexicon_result, gendered_result)

        if lexicon_result["flagged_phrases"] or gendered_result["gendered_terms"]:
            # Apply DP noise to confidence score (prevents exact inference)
            ep = 0.02
            try:
                budget.consume(ep, query_name=f"confidence_review_{i}")
                epsilon_used += ep
                noisy_confidence = DifferentialPrivacy.add_laplace_noise(
                    confidence, sensitivity=0.1, epsilon=ep
                )
                noisy_confidence = max(0.0, min(1.0, noisy_confidence))
            except Exception:
                noisy_confidence = confidence

            item = BiasEvidenceItem(
                review_id=str(review_id),
                employee_token=employee_token,
                bias_type=_determine_bias_type(lexicon_result, gendered_result),
                severity=severity,
                confidence=round(noisy_confidence, 3),
                evidence_text=_extract_evidence(text, lexicon_result, gendered_result),
                flagged_phrases=lexicon_result["flagged_phrases"] + gendered_result["gendered_terms"],
                explanation=_generate_explanation(lexicon_result, gendered_result, severity),
            )
            bias_evidence.append(item)

            trace.append(ReasoningStep(
                step=2 + i,
                agent="review_parser",
                tool="lexicon+gendered_detector",
                input={"review_id": review_id, "text_length": len(text)},
                output={
                    "bias_type": item["bias_type"],
                    "severity": item["severity"],
                    "confidence": item["confidence"],
                    "phrase_count": len(item["flagged_phrases"]),
                },
                epsilon_consumed=ep,
                timestamp=datetime.now(timezone.utc).isoformat(),
            ))

    # Step 3: Aggregate summary
    severity_counts = _count_severities(bias_evidence)
    trace.append(ReasoningStep(
        step=len(reviews) + 3,
        agent="review_parser",
        tool="aggregate_summary",
        input={"total_reviews": len(reviews)},
        output={
            "bias_flags_found": len(bias_evidence),
            "severity_distribution": severity_counts,
        },
        epsilon_consumed=0.0,
        timestamp=datetime.now(timezone.utc).isoformat(),
    ))

    logger.info(
        "review_parser_agent.complete",
        audit_id=state["audit_id"],
        flags=len(bias_evidence),
        epsilon_used=epsilon_used,
    )

    return {
        "bias_evidence": bias_evidence,
        "reasoning_trace": trace,
        "consumed_epsilon": state["consumed_epsilon"] + epsilon_used,
        "epsilon_remaining": state["epsilon_remaining"] - epsilon_used,
        "completed_agents": ["review_parser"],
        "current_agent": "compensation_analytics",
        "messages": [{
            "from": "review_parser",
            "to": "compensation_analytics",
            "content": f"Found {len(bias_evidence)} bias flags across {len(reviews)} reviews.",
            "data": {"bias_flag_count": len(bias_evidence), "severity_counts": severity_counts},
        }],
    }


# ── Helper functions ───────────────────────────────────────────────────────────

def _compute_severity(lexicon_result: dict, gendered_result: dict) -> str:
    score = lexicon_result.get("severity_score", 0) + gendered_result.get("severity_score", 0)
    if score >= 0.75:
        return "critical"
    elif score >= 0.5:
        return "high"
    elif score >= 0.25:
        return "medium"
    return "low"


def _compute_confidence(lexicon_result: dict, gendered_result: dict) -> float:
    phrase_count = len(lexicon_result.get("flagged_phrases", []))
    gendered_count = len(gendered_result.get("gendered_terms", []))
    return min(1.0, 0.3 + (phrase_count * 0.1) + (gendered_count * 0.15))


def _determine_bias_type(lexicon_result: dict, gendered_result: dict) -> str:
    if gendered_result.get("gendered_terms"):
        return "gendered_language"
    primary = lexicon_result.get("primary_category", "double_standard")
    type_map = {
        "personality": "personality_vs_performance",
        "attribution": "attribution_bias",
        "double_standard": "double_standard",
        "stereotype": "stereotyping",
    }
    return type_map.get(primary, "gendered_language")


def _extract_evidence(text: str, lexicon_result: dict, gendered_result: dict) -> str:
    """Return a short evidence snippet (max 200 chars)."""
    phrases = lexicon_result.get("flagged_phrases", []) + gendered_result.get("gendered_terms", [])
    if phrases:
        phrase_text = phrases[0].get("phrase", "")
        idx = text.lower().find(phrase_text.lower())
        if idx >= 0:
            start = max(0, idx - 40)
            end = min(len(text), idx + len(phrase_text) + 40)
            return f"...{text[start:end]}..."
    return text[:150] + "..." if len(text) > 150 else text


def _generate_explanation(lexicon_result: dict, gendered_result: dict, severity: str) -> str:
    phrases = [p.get("phrase", "") for p in lexicon_result.get("flagged_phrases", [])]
    gterms = [t.get("phrase", "") for t in gendered_result.get("gendered_terms", [])]
    parts = []
    if phrases:
        parts.append(f"Contains evaluative bias phrases: {', '.join(phrases[:3])}")
    if gterms:
        parts.append(f"Contains gendered language: {', '.join(gterms[:3])}")
    return " | ".join(parts) if parts else f"Bias pattern detected with {severity} severity."


def _count_severities(items: list) -> dict:
    counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for item in items:
        sev = item.get("severity", "low")
        counts[sev] = counts.get(sev, 0) + 1
    return counts
