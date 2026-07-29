"""
PayParity — Agent 4: Equity Framework Agent

Integrates results from all three prior agents + budget constraints
to generate prioritized, budget-constrained equity restoration plans.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

import structlog

from app.agents.state import (
    AgentSwarmState, EquityAdjustment, BiasEvidenceItem,
    PayGapResult, CounterfactualResult, ReasoningStep
)
from app.core.privacy import DifferentialPrivacy, PrivacyBudgetTracker
from app.tools.compliance_kb import ComplianceKnowledgeBase
from app.tools.benchmark_api import CompensationBenchmarkAPI

logger = structlog.get_logger(__name__)

AGENT_EPSILON_SHARE = 0.15


def run_equity_framework_agent(state: AgentSwarmState) -> dict:
    """LangGraph node: Equity Framework Agent."""
    logger.info("equity_framework_agent.start", audit_id=state["audit_id"])

    budget = PrivacyBudgetTracker(
        total_epsilon=min(AGENT_EPSILON_SHARE, state["epsilon_remaining"])
    )

    trace: List[ReasoningStep] = []
    equity_adjustments: List[EquityAdjustment] = []
    epsilon_used = 0.0

    pay_gaps = state.get("pay_gap_results", [])
    bias_flags = state.get("bias_evidence", [])
    cf_results = state.get("counterfactual_results", [])
    budget_usd = state.get("budget_constraint_usd", 500_000.0)

    # ── Step 1: Load compliance knowledge base ─────────────────────────────────
    compliance_kb = ComplianceKnowledgeBase()
    benchmark_api = CompensationBenchmarkAPI()

    trace.append(ReasoningStep(
        step=1, agent="equity_framework", tool="ComplianceKnowledgeBase.load",
        input={}, output={"rules_loaded": len(compliance_kb.rules)},
        epsilon_consumed=0.0, timestamp=datetime.now(timezone.utc).isoformat(),
    ))

    # ── Step 2: Score and prioritize gaps ─────────────────────────────────────
    gap_items = _score_gaps(pay_gaps, bias_flags, cf_results)

    trace.append(ReasoningStep(
        step=2, agent="equity_framework", tool="GapScorer",
        input={"gap_count": len(gap_items)},
        output={"scored_gaps": gap_items},
        epsilon_consumed=0.0, timestamp=datetime.now(timezone.utc).isoformat(),
    ))

    # ── Step 3: Generate budget-constrained adjustments ────────────────────────
    remaining_budget = budget_usd
    cumulative_cost = 0.0

    for i, gap_item in enumerate(sorted(gap_items, key=lambda x: x["priority"], reverse=True)):
        if remaining_budget <= 0:
            break

        ep = 0.02
        try:
            budget.consume(ep, query_name=f"adjustment_{i}")
            epsilon_used += ep
        except Exception:
            break

        dimension = gap_item["dimension"]
        gap_pct = gap_item["gap_pct"]
        affected_count_estimate = gap_item.get("sample_size_dp", 50)

        # Get benchmark data
        market_data = benchmark_api.get_benchmark(dimension)

        # Calculate adjustment needed
        adjustment_pct = _calculate_adjustment(gap_pct, market_data)

        # Estimate cost (DP-noised)
        raw_cost = _estimate_cost(
            gap_pct=adjustment_pct,
            affected_count=affected_count_estimate,
            avg_salary=market_data.get("median_salary", 95000),
        )
        dp_cost = DifferentialPrivacy.add_laplace_noise(raw_cost, sensitivity=5000, epsilon=ep)
        dp_cost = max(0, dp_cost)

        if dp_cost > remaining_budget:
            # Partial adjustment within budget
            adjustment_pct = adjustment_pct * (remaining_budget / dp_cost)
            dp_cost = remaining_budget

        # Compliance check
        compliance_notes = compliance_kb.check_recommendation(
            dimension=dimension,
            adjustment_pct=adjustment_pct,
        )

        priority_score = gap_item["priority"] * 100

        adjustment = EquityAdjustment(
            target_scope=f"{dimension.replace('_', ' ').title()} pay equity",
            affected_group=gap_item.get("group", dimension),
            gap_pct=round(gap_pct, 4),
            recommended_adjustment_pct=round(adjustment_pct, 4),
            estimated_cost_usd=round(dp_cost, 2),
            priority_score=round(priority_score, 2),
            action_plan={
                "phase_1": f"Identify {dimension} salary outliers in bottom quartile",
                "phase_2": f"Apply {adjustment_pct:.1f}% equity adjustment to affected cohort",
                "phase_3": "Re-evaluate performance ratings with bias-aware criteria",
                "phase_4": "Monitor compa-ratio quarterly for regression",
                "compliance_notes": compliance_notes,
                "estimated_implementation_months": 3,
                "expected_gap_reduction_pct": round(adjustment_pct * 0.85, 2),
            },
        )
        equity_adjustments.append(adjustment)
        remaining_budget -= dp_cost
        cumulative_cost += dp_cost

        trace.append(ReasoningStep(
            step=3 + i, agent="equity_framework", tool="AdjustmentCalculator",
            input={"dimension": dimension, "gap_pct": gap_pct, "budget_remaining": remaining_budget},
            output={
                "adjustment_pct": adjustment_pct,
                "cost_usd": dp_cost,
                "priority_score": priority_score,
            },
            epsilon_consumed=ep,
            timestamp=datetime.now(timezone.utc).isoformat(),
        ))

    # ── Step 4: Build summary ──────────────────────────────────────────────────
    summary = {
        "total_adjustments": len(equity_adjustments),
        "total_estimated_cost_usd": round(cumulative_cost, 2),
        "budget_utilized_pct": round((cumulative_cost / budget_usd) * 100, 2) if budget_usd > 0 else 0,
        "dimensions_addressed": list({a["affected_group"] for a in equity_adjustments}),
        "highest_priority_action": equity_adjustments[0]["target_scope"] if equity_adjustments else None,
        "epsilon_consumed_total": round(state["consumed_epsilon"] + epsilon_used, 4),
    }

    logger.info("equity_framework_agent.complete", audit_id=state["audit_id"],
                adjustments=len(equity_adjustments), cost=cumulative_cost)

    return {
        "equity_adjustments": equity_adjustments,
        "reasoning_trace": trace,
        "consumed_epsilon": state["consumed_epsilon"] + epsilon_used,
        "epsilon_remaining": state["epsilon_remaining"] - epsilon_used,
        "completed_agents": ["equity_framework"],
        "current_agent": "done",
        "swarm_status": "completed",
        "summary": summary,
        "messages": [{
            "from": "equity_framework",
            "to": "hitl_gate",
            "content": (
                f"Equity analysis complete. Generated {len(equity_adjustments)} recommendations "
                f"totaling ${cumulative_cost:,.2f}. All require HITL approval before finalization."
            ),
            "data": {"summary": summary},
        }],
    }


# ── Helpers ────────────────────────────────────────────────────────────────────

def _score_gaps(
    pay_gaps: List[PayGapResult],
    bias_flags: List[BiasEvidenceItem],
    cf_results: List[CounterfactualResult],
) -> list:
    """Score and merge gap signals from all three agents."""
    scored = []
    for gap in pay_gaps:
        score = 0.0
        gap_pct = abs(gap.get("residual_gap_pct", 0))
        score += min(gap_pct / 20.0, 1.0) * 0.5  # 50% weight on gap size
        if gap.get("is_significant"):
            score += 0.3
        # Boost if corresponding CF result is also significant
        for cf in cf_results:
            if gap["dimension"] in cf["attribute_swapped"] and cf["is_significant"]:
                score += 0.2
                break
        # Boost by bias flag count correlation
        bias_weight = min(len(bias_flags) / 50, 1.0) * 0.1
        score += bias_weight

        scored.append({
            "dimension": gap["dimension"],
            "gap_pct": gap_pct,
            "sample_size_dp": gap.get("sample_size_dp", 50),
            "priority": min(score, 1.0),
            "group": gap["dimension"],
        })

    return scored


def _calculate_adjustment(gap_pct: float, market_data: dict) -> float:
    """
    Calculate recommended salary adjustment percentage.
    Targets eliminating the unexplained residual gap.
    """
    # Apply 80% correction (not 100% — accounts for measurement uncertainty)
    correction_factor = 0.80
    return round(abs(gap_pct) * correction_factor, 4)


def _estimate_cost(gap_pct: float, affected_count: int, avg_salary: float) -> float:
    """Rough cost estimate for equity adjustments."""
    return affected_count * avg_salary * (gap_pct / 100.0)
