"""
PayParity — LangGraph Agent Orchestrator

Builds and compiles the multi-agent graph:
  START → review_parser → compensation_analytics → counterfactual_audit
        → equity_framework → END

Includes failure recovery, retry logic, and streaming event emission.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import structlog
from langgraph.graph import StateGraph, END

from app.agents.state import AgentSwarmState
from app.agents.review_parser import run_review_parser_agent
from app.agents.compensation import run_compensation_analytics_agent
from app.agents.counterfactual import run_counterfactual_agent
from app.agents.equity_framework import run_equity_framework_agent
from app.config import settings

logger = structlog.get_logger(__name__)

# Maximum retries per agent node
MAX_RETRIES = 2


def _wrap_with_retry(agent_fn, agent_name: str, max_retries: int = MAX_RETRIES):
    """Wrap an agent function with retry logic and error capture."""
    def wrapped(state: AgentSwarmState) -> dict:
        for attempt in range(max_retries + 1):
            try:
                result = agent_fn(state)
                return result
            except Exception as e:
                logger.warning(
                    "agent_execution_error",
                    agent=agent_name,
                    attempt=attempt + 1,
                    error=str(e),
                )
                if attempt == max_retries:
                    return {
                        "errors": [f"{agent_name}: {str(e)}"],
                        "completed_agents": [],
                        "reasoning_trace": [{
                            "step": 0,
                            "agent": agent_name,
                            "tool": "error_handler",
                            "input": {},
                            "output": {"error": str(e), "attempt": attempt + 1},
                            "epsilon_consumed": 0.0,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        }],
                        "current_agent": _get_next_agent(agent_name),
                    }
    return wrapped


def _get_next_agent(agent_name: str) -> str:
    """Get the next agent even on failure (fail-forward)."""
    seq = ["review_parser", "compensation_analytics", "counterfactual_audit", "equity_framework"]
    try:
        idx = seq.index(agent_name)
        return seq[idx + 1] if idx + 1 < len(seq) else "done"
    except ValueError:
        return "done"


def should_continue(state: AgentSwarmState) -> str:
    """Router: decide next node based on current_agent."""
    current = state.get("current_agent", "done")
    node_map = {
        "compensation_analytics": "compensation_analytics",
        "counterfactual_audit": "counterfactual_audit",
        "equity_framework": "equity_framework",
        "done": END,
    }
    return node_map.get(current, END)


def build_agent_graph() -> StateGraph:
    """Build and return the compiled LangGraph StateGraph."""
    graph = StateGraph(AgentSwarmState)

    # Register nodes
    graph.add_node(
        "review_parser",
        _wrap_with_retry(run_review_parser_agent, "review_parser")
    )
    graph.add_node(
        "compensation_analytics",
        _wrap_with_retry(run_compensation_analytics_agent, "compensation_analytics")
    )
    graph.add_node(
        "counterfactual_audit",
        _wrap_with_retry(run_counterfactual_agent, "counterfactual_audit")
    )
    graph.add_node(
        "equity_framework",
        _wrap_with_retry(run_equity_framework_agent, "equity_framework")
    )

    # Entry point
    graph.set_entry_point("review_parser")

    # Edges with conditional routing
    graph.add_conditional_edges("review_parser", should_continue, {
        "compensation_analytics": "compensation_analytics",
        END: END,
    })
    graph.add_conditional_edges("compensation_analytics", should_continue, {
        "counterfactual_audit": "counterfactual_audit",
        END: END,
    })
    graph.add_conditional_edges("counterfactual_audit", should_continue, {
        "equity_framework": "equity_framework",
        END: END,
    })
    graph.add_edge("equity_framework", END)

    return graph.compile()


# ── Swarm executor ─────────────────────────────────────────────────────────────

class AgentSwarmRunner:
    """High-level runner for the PayParity agent swarm."""

    def __init__(self):
        self.graph = build_agent_graph()

    def build_initial_state(
        self,
        audit_id: str,
        organization_id: str,
        reviews: list,
        salary_records: list,
        promotion_records: list,
        allocated_epsilon: float,
        budget_constraint_usd: float = 500_000.0,
    ) -> AgentSwarmState:
        return AgentSwarmState(
            audit_id=audit_id,
            organization_id=organization_id,
            run_id=str(uuid.uuid4()),
            reviews=reviews,
            salary_records=salary_records,
            promotion_records=promotion_records,
            budget_constraint_usd=budget_constraint_usd,
            allocated_epsilon=allocated_epsilon,
            consumed_epsilon=0.0,
            epsilon_remaining=allocated_epsilon,
            bias_evidence=[],
            pay_gap_results=[],
            counterfactual_results=[],
            equity_adjustments=[],
            reasoning_trace=[],
            messages=[],
            current_agent="compensation_analytics",
            errors=[],
            completed_agents=[],
            swarm_status="running",
            summary=None,
        )

    def run(
        self,
        audit_id: str,
        organization_id: str,
        reviews: list,
        salary_records: list,
        promotion_records: list,
        allocated_epsilon: float,
        budget_constraint_usd: float = 500_000.0,
    ) -> AgentSwarmState:
        """
        Execute the full agent swarm synchronously.
        Returns final state.
        """
        initial_state = self.build_initial_state(
            audit_id=audit_id,
            organization_id=organization_id,
            reviews=reviews,
            salary_records=salary_records,
            promotion_records=promotion_records,
            allocated_epsilon=allocated_epsilon,
            budget_constraint_usd=budget_constraint_usd,
        )

        logger.info(
            "swarm_starting",
            audit_id=audit_id,
            reviews=len(reviews),
            salary_records=len(salary_records),
            epsilon=allocated_epsilon,
        )

        final_state = self.graph.invoke(initial_state)

        logger.info(
            "swarm_complete",
            audit_id=audit_id,
            bias_flags=len(final_state.get("bias_evidence", [])),
            pay_gaps=len(final_state.get("pay_gap_results", [])),
            recommendations=len(final_state.get("equity_adjustments", [])),
            epsilon_consumed=final_state.get("consumed_epsilon", 0.0),
            errors=len(final_state.get("errors", [])),
        )

        return final_state


# ── Singleton runner ───────────────────────────────────────────────────────────
_runner: AgentSwarmRunner | None = None


def get_swarm_runner() -> AgentSwarmRunner:
    global _runner
    if _runner is None:
        _runner = AgentSwarmRunner()
    return _runner
