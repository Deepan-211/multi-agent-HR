"""
PayParity — LangGraph Agent State
Shared TypedDict that flows through all nodes in the agent graph.
"""
from __future__ import annotations

from typing import TypedDict, Annotated, List, Optional, Any
from datetime import datetime
import operator


class ReasoningStep(TypedDict):
    step: int
    agent: str
    tool: Optional[str]
    input: Any
    output: Any
    epsilon_consumed: float
    timestamp: str


class BiasEvidenceItem(TypedDict):
    review_id: str
    employee_token: str
    bias_type: str
    severity: str
    confidence: float
    evidence_text: str
    flagged_phrases: List[dict]
    explanation: str


class PayGapResult(TypedDict):
    dimension: str                  # "gender", "ethnicity", "combined"
    raw_gap_pct: float              # Unadjusted gap
    controlled_gap_pct: float      # After regression controls
    residual_gap_pct: float        # Unexplained by legitimate factors
    is_significant: bool
    p_value: float
    confidence_interval: List[float]
    sample_size_dp: int             # DP-protected count


class CounterfactualResult(TypedDict):
    attribute_swapped: str
    from_group: str
    to_group: str
    rating_delta: float
    effect_size: float
    p_value: float
    is_significant: bool
    interpretation: str


class EquityAdjustment(TypedDict):
    target_scope: str
    affected_group: str
    gap_pct: float
    recommended_adjustment_pct: float
    estimated_cost_usd: float
    priority_score: float
    action_plan: dict


class AgentSwarmState(TypedDict):
    """
    Central state object threaded through the LangGraph agent graph.
    Uses Annotated[list, operator.add] to accumulate messages across nodes.
    """
    # Identifiers
    audit_id: str
    organization_id: str
    run_id: str

    # Input data (loaded from DB before graph starts)
    reviews: List[dict]
    salary_records: List[dict]
    promotion_records: List[dict]
    budget_constraint_usd: float
    allocated_epsilon: float

    # Privacy budget tracker (in-memory)
    consumed_epsilon: float
    epsilon_remaining: float

    # Agent outputs
    bias_evidence: Annotated[List[BiasEvidenceItem], operator.add]
    pay_gap_results: Annotated[List[PayGapResult], operator.add]
    counterfactual_results: Annotated[List[CounterfactualResult], operator.add]
    equity_adjustments: Annotated[List[EquityAdjustment], operator.add]

    # Reasoning trace (all steps from all agents)
    reasoning_trace: Annotated[List[ReasoningStep], operator.add]

    # Inter-agent messages
    messages: Annotated[List[dict], operator.add]

    # Control flow
    current_agent: str
    errors: Annotated[List[str], operator.add]
    completed_agents: Annotated[List[str], operator.add]

    # Final status
    swarm_status: str  # "running" | "completed" | "failed"
    summary: Optional[dict]
