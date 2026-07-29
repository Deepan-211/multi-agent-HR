"""
PayParity — Agent 3: Counterfactual Audit Agent

Systematically swaps demographic variables in review text and re-evaluates
rating sensitivity. Uses text-based counterfactual substitution.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
import numpy as np
from scipy import stats

import structlog

from app.agents.state import AgentSwarmState, CounterfactualResult, ReasoningStep
from app.core.privacy import DifferentialPrivacy, PrivacyBudgetTracker
from app.tools.text_analysis import CounterfactualTextSubstituter
from app.tools.statistical import cohens_d

logger = structlog.get_logger(__name__)

AGENT_EPSILON_SHARE = 0.20


def run_counterfactual_agent(state: AgentSwarmState) -> dict:
    """LangGraph node: Counterfactual Audit Agent."""
    logger.info("counterfactual_agent.start", audit_id=state["audit_id"])

    budget = PrivacyBudgetTracker(
        total_epsilon=min(AGENT_EPSILON_SHARE, state["epsilon_remaining"])
    )

    trace: List[ReasoningStep] = []
    counterfactual_results: List[CounterfactualResult] = []
    epsilon_used = 0.0

    reviews = state.get("reviews", [])
    substituter = CounterfactualTextSubstituter()

    # Define counterfactual experiments
    experiments = [
        {
            "attribute": "gender_group",
            "from_group": "G1",   # e.g. women-coded
            "to_group": "G2",     # e.g. men-coded
            "substitution_map": substituter.GENDER_SUBSTITUTIONS,
        },
        {
            "attribute": "gender_group",
            "from_group": "G2",
            "to_group": "G1",
            "substitution_map": substituter.GENDER_SUBSTITUTIONS_REVERSE,
        },
    ]

    for exp_idx, experiment in enumerate(experiments):
        attr = experiment["attribute"]
        from_grp = experiment["from_group"]
        to_grp = experiment["to_group"]
        sub_map = experiment["substitution_map"]

        # Filter reviews for the source group
        source_reviews = [
            r for r in reviews
            if r.get("gender_group", "G1") == from_grp and r.get("review_text")
        ]

        if len(source_reviews) < 5:
            logger.info("counterfactual_agent.insufficient_sample",
                        from_group=from_grp, sample=len(source_reviews))
            continue

        ep_batch = 0.05
        try:
            budget.consume(ep_batch, query_name=f"cf_experiment_{exp_idx}")
            epsilon_used += ep_batch
        except Exception:
            break

        # Run counterfactual substitution
        original_scores = []
        cf_scores = []

        for review in source_reviews:
            orig_text = review.get("review_text", "")
            cf_text = substituter.substitute(orig_text, sub_map)

            orig_score = _score_text_sentiment(orig_text)
            cf_score = _score_text_sentiment(cf_text)

            original_scores.append(orig_score)
            cf_scores.append(cf_score)

        if len(original_scores) < 5:
            continue

        orig_arr = np.array(original_scores)
        cf_arr = np.array(cf_scores)

        # Statistical test
        t_stat, p_value = stats.ttest_rel(orig_arr, cf_arr)
        effect_size = cohens_d(orig_arr, cf_arr)

        # Apply DP noise to mean scores
        ep_means = 0.03
        try:
            budget.consume(ep_means, query_name=f"cf_means_{exp_idx}")
            epsilon_used += ep_means
        except Exception:
            pass

        orig_mean = DifferentialPrivacy.privatize_mean(
            original_scores, clip_bound=1.0, epsilon=ep_means
        )
        cf_mean = DifferentialPrivacy.privatize_mean(
            cf_scores, clip_bound=1.0, epsilon=ep_means
        )
        rating_delta = round(cf_mean - orig_mean, 4)

        # DP-protect count
        dp_n = DifferentialPrivacy.privatize_count(len(source_reviews))

        result = CounterfactualResult(
            attribute_swapped=attr,
            from_group=from_grp,
            to_group=to_grp,
            rating_delta=rating_delta,
            effect_size=round(float(effect_size), 4),
            p_value=round(float(p_value), 4),
            is_significant=float(p_value) < 0.05 and abs(effect_size) > 0.2,
            interpretation=_interpret_result(from_grp, to_grp, rating_delta, p_value),
        )
        counterfactual_results.append(result)

        trace.append(ReasoningStep(
            step=exp_idx + 1,
            agent="counterfactual_audit",
            tool="CounterfactualTextSubstituter + ttest_rel",
            input={"attribute": attr, "from": from_grp, "to": to_grp,
                   "sample_size_dp": dp_n},
            output={
                "rating_delta": rating_delta,
                "effect_size": float(effect_size),
                "p_value": float(p_value),
                "is_significant": result["is_significant"],
            },
            epsilon_consumed=ep_batch + ep_means,
            timestamp=datetime.now(timezone.utc).isoformat(),
        ))

    logger.info("counterfactual_agent.complete", audit_id=state["audit_id"],
                experiments=len(counterfactual_results), epsilon_used=epsilon_used)

    return {
        "counterfactual_results": counterfactual_results,
        "reasoning_trace": trace,
        "consumed_epsilon": state["consumed_epsilon"] + epsilon_used,
        "epsilon_remaining": state["epsilon_remaining"] - epsilon_used,
        "completed_agents": ["counterfactual_audit"],
        "current_agent": "equity_framework",
        "messages": [{
            "from": "counterfactual_audit",
            "to": "equity_framework",
            "content": (
                f"Completed {len(counterfactual_results)} counterfactual experiments. "
                f"Significant results: {sum(1 for r in counterfactual_results if r['is_significant'])}."
            ),
            "data": {"experiments": counterfactual_results},
        }],
    }


# ── Scoring helpers ────────────────────────────────────────────────────────────

def _score_text_sentiment(text: str) -> float:
    """
    Lightweight rule-based positivity score (0-1).
    Production: use a fine-tuned sentiment model.
    """
    positive_words = {
        "excellent", "outstanding", "exceptional", "leadership", "strategic",
        "innovative", "strong", "decisive", "confident", "authoritative",
        "brilliant", "impact", "high-performing", "champion", "drove",
    }
    negative_words = {
        "emotional", "abrasive", "aggressive", "difficult", "lacks",
        "needs improvement", "sometimes", "inconsistent", "moody",
        "too direct", "bossy", "pushy", "not strategic", "quiet",
    }
    words = set(text.lower().split())
    pos = len(words & positive_words)
    neg = len(words & negative_words)
    total = pos + neg if (pos + neg) > 0 else 1
    return pos / total


def _interpret_result(
    from_grp: str, to_grp: str, delta: float, p_value: float
) -> str:
    direction = "more positively" if delta > 0 else "less positively"
    significance = "statistically significant" if p_value < 0.05 else "not statistically significant"
    return (
        f"Reviews written for {from_grp} employees are scored {direction} "
        f"(Δ={delta:+.3f}) when rewritten for {to_grp} employees. "
        f"This difference is {significance} (p={p_value:.3f})."
    )
