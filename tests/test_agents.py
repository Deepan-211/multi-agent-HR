"""
PayParity — Agent Unit Tests
Tests each agent produces valid output with sample data.
"""
import pytest
import uuid


SAMPLE_REVIEWS = [
    {
        "id": str(uuid.uuid4()),
        "employee_token": "EMP_001",
        "gender_group": "G1",
        "review_text": (
            "She is abrasive and bossy at times. "
            "Lacks executive presence. Overly emotional in meetings. "
            "Needs to be more collaborative and less aggressive."
        ),
        "performance_rating": 3.2,
    },
    {
        "id": str(uuid.uuid4()),
        "employee_token": "EMP_002",
        "gender_group": "G2",
        "review_text": (
            "He is a decisive leader who drives results. "
            "Outstanding strategic thinker with strong executive presence. "
            "Excellent performance across all dimensions."
        ),
        "performance_rating": 4.8,
    },
    {
        "id": str(uuid.uuid4()),
        "employee_token": "EMP_003",
        "gender_group": "G1",
        "review_text": "She can sometimes be too direct. Overly emotional when stressed.",
        "performance_rating": 3.5,
    },
]

SAMPLE_SALARY = [
    {"id": str(uuid.uuid4()), "employee_token": "EMP_001", "base_salary": 95000,
     "gender_group": "G1", "role_level": "L3", "tenure_years": 3.0, "performance_rating": 3.2,
     "department_code": "ENG", "location_region": "US-WEST"},
    {"id": str(uuid.uuid4()), "employee_token": "EMP_002", "base_salary": 130000,
     "gender_group": "G2", "role_level": "L3", "tenure_years": 3.5, "performance_rating": 4.8,
     "department_code": "ENG", "location_region": "US-WEST"},
    {"id": str(uuid.uuid4()), "employee_token": "EMP_003", "base_salary": 92000,
     "gender_group": "G1", "role_level": "L3", "tenure_years": 2.8, "performance_rating": 3.5,
     "department_code": "ENG", "location_region": "US-WEST"},
    {"id": str(uuid.uuid4()), "employee_token": "EMP_004", "base_salary": 128000,
     "gender_group": "G2", "role_level": "L3", "tenure_years": 3.2, "performance_rating": 4.2,
     "department_code": "ENG", "location_region": "US-WEST"},
    {"id": str(uuid.uuid4()), "employee_token": "EMP_005", "base_salary": 96000,
     "gender_group": "G1", "role_level": "L3", "tenure_years": 3.1, "performance_rating": 3.6,
     "department_code": "ENG", "location_region": "US-WEST"},
    {"id": str(uuid.uuid4()), "employee_token": "EMP_006", "base_salary": 131000,
     "gender_group": "G2", "role_level": "L3", "tenure_years": 3.6, "performance_rating": 4.7,
     "department_code": "ENG", "location_region": "US-WEST"},
]


class TestReviewParserAgent:
    def test_detects_bias_phrases(self):
        from app.agents.review_parser import run_review_parser_agent
        from app.agents.state import AgentSwarmState

        state = AgentSwarmState(
            audit_id="test-audit-id",
            organization_id="test-org-id",
            run_id="test-run-id",
            reviews=SAMPLE_REVIEWS,
            salary_records=[],
            promotion_records=[],
            budget_constraint_usd=500000.0,
            allocated_epsilon=1.0,
            consumed_epsilon=0.0,
            epsilon_remaining=1.0,
            bias_evidence=[],
            pay_gap_results=[],
            counterfactual_results=[],
            equity_adjustments=[],
            reasoning_trace=[],
            messages=[],
            current_agent="review_parser",
            errors=[],
            completed_agents=[],
            swarm_status="running",
            summary=None,
        )

        result = run_review_parser_agent(state)
        bias_evidence = result.get("bias_evidence", [])

        # Should detect bias in the negatively-worded reviews
        assert len(bias_evidence) > 0

        # All items should have required fields
        for item in bias_evidence:
            assert "bias_type" in item
            assert "severity" in item
            assert "confidence" in item
            assert 0.0 <= item["confidence"] <= 1.0

    def test_severity_levels_valid(self):
        from app.agents.review_parser import run_review_parser_agent
        from app.agents.state import AgentSwarmState

        state = AgentSwarmState(
            audit_id="test", organization_id="test", run_id="r",
            reviews=SAMPLE_REVIEWS, salary_records=[], promotion_records=[],
            budget_constraint_usd=500000.0, allocated_epsilon=1.0,
            consumed_epsilon=0.0, epsilon_remaining=1.0, bias_evidence=[],
            pay_gap_results=[], counterfactual_results=[], equity_adjustments=[],
            reasoning_trace=[], messages=[], current_agent="review_parser",
            errors=[], completed_agents=[], swarm_status="running", summary=None,
        )
        result = run_review_parser_agent(state)
        valid_severities = {"low", "medium", "high", "critical"}
        for item in result.get("bias_evidence", []):
            assert item["severity"] in valid_severities

    def test_reasoning_trace_populated(self):
        from app.agents.review_parser import run_review_parser_agent
        from app.agents.state import AgentSwarmState

        state = AgentSwarmState(
            audit_id="test", organization_id="test", run_id="r",
            reviews=SAMPLE_REVIEWS, salary_records=[], promotion_records=[],
            budget_constraint_usd=500000.0, allocated_epsilon=1.0,
            consumed_epsilon=0.0, epsilon_remaining=1.0, bias_evidence=[],
            pay_gap_results=[], counterfactual_results=[], equity_adjustments=[],
            reasoning_trace=[], messages=[], current_agent="review_parser",
            errors=[], completed_agents=[], swarm_status="running", summary=None,
        )
        result = run_review_parser_agent(state)
        assert len(result.get("reasoning_trace", [])) > 0


class TestCompensationAgent:
    def test_computes_pay_gap(self):
        from app.agents.compensation import run_compensation_analytics_agent
        from app.agents.state import AgentSwarmState

        state = AgentSwarmState(
            audit_id="test", organization_id="test", run_id="r",
            reviews=[], salary_records=SAMPLE_SALARY, promotion_records=[],
            budget_constraint_usd=500000.0, allocated_epsilon=1.0,
            consumed_epsilon=0.0, epsilon_remaining=1.0, bias_evidence=[],
            pay_gap_results=[], counterfactual_results=[], equity_adjustments=[],
            reasoning_trace=[], messages=[], current_agent="compensation_analytics",
            errors=[], completed_agents=[], swarm_status="running", summary=None,
        )
        result = run_compensation_analytics_agent(state)
        gaps = result.get("pay_gap_results", [])

        # Should find at least one gap dimension
        assert len(gaps) > 0
        for gap in gaps:
            assert "dimension" in gap
            assert "raw_gap_pct" in gap
            assert "p_value" in gap


class TestEquityFrameworkAgent:
    def test_generates_recommendations(self):
        from app.agents.equity_framework import run_equity_framework_agent
        from app.agents.state import AgentSwarmState

        state = AgentSwarmState(
            audit_id="test", organization_id="test", run_id="r",
            reviews=[], salary_records=SAMPLE_SALARY, promotion_records=[],
            budget_constraint_usd=500000.0, allocated_epsilon=1.0,
            consumed_epsilon=0.3, epsilon_remaining=0.7,
            bias_evidence=[{"bias_type": "gendered_language", "severity": "high", "confidence": 0.8,
                             "employee_token": "EMP_001", "review_id": "r1",
                             "evidence_text": "abrasive", "flagged_phrases": [], "explanation": "test"}],
            pay_gap_results=[{
                "dimension": "gender",
                "raw_gap_pct": -18.5,
                "controlled_gap_pct": -12.3,
                "residual_gap_pct": -8.5,
                "is_significant": True,
                "p_value": 0.02,
                "confidence_interval": [-15.0, -2.0],
                "sample_size_dp": 42,
            }],
            counterfactual_results=[],
            equity_adjustments=[], reasoning_trace=[], messages=[],
            current_agent="equity_framework", errors=[], completed_agents=[],
            swarm_status="running", summary=None,
        )
        result = run_equity_framework_agent(state)
        adjustments = result.get("equity_adjustments", [])
        assert len(adjustments) > 0
        for adj in adjustments:
            assert "recommended_adjustment_pct" in adj
            assert "estimated_cost_usd" in adj
            assert adj["estimated_cost_usd"] >= 0
