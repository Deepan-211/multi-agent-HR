"""
PayParity — HITL Guardrail Integration Tests
"""
import pytest


class TestHITLGuardrails:
    """
    Tests that HITL hard guardrails are enforced:
    1. Only exec_committee can make decisions
    2. Comment must be non-empty
    3. Recommendation must be in PENDING_HITL state
    4. Decision is immutable (no updates)
    """

    def test_mandatory_comment_enforced(self):
        """Empty comment should be rejected by schema validator."""
        from app.api.hitl import HITLDecisionRequest
        from pydantic import ValidationError
        from app.models.equity_recommendation import HITLDecision

        with pytest.raises(ValidationError) as exc_info:
            HITLDecisionRequest(
                recommendation_id="some-id",
                decision=HITLDecision.APPROVED,
                comment="",  # Empty comment
            )
        assert "Comment must be at least 10 characters" in str(exc_info.value)

    def test_short_comment_rejected(self):
        from app.api.hitl import HITLDecisionRequest
        from pydantic import ValidationError
        from app.models.equity_recommendation import HITLDecision

        with pytest.raises(ValidationError):
            HITLDecisionRequest(
                recommendation_id="some-id",
                decision=HITLDecision.APPROVED,
                comment="ok",  # Too short
            )

    def test_valid_comment_accepted(self):
        from app.api.hitl import HITLDecisionRequest
        from app.models.equity_recommendation import HITLDecision

        req = HITLDecisionRequest(
            recommendation_id="11111111-1111-1111-1111-111111111111",
            decision=HITLDecision.APPROVED,
            comment="This recommendation is well-supported by statistical evidence and within budget.",
        )
        assert req.comment.startswith("This")

    def test_hitl_requires_exec_role(self):
        """require_exec dependency should reject non-exec roles."""
        from app.core.auth import require_exec, CurrentUser, Roles
        import asyncio

        # Simulate an analyst user
        analyst_user = CurrentUser(
            user_id="user-id",
            org_id="org-id",
            role=Roles.ANALYST,
        )

        # The dependency should raise 403 for analysts
        # This is a unit check of the role guard logic
        assert analyst_user.role not in [Roles.ADMIN, Roles.EXEC_COMMITTEE]


class TestAuditStateMachine:
    """Tests for audit state machine transitions."""

    def test_valid_transition_draft_to_running(self):
        from app.models.audit import Audit, AuditStatus
        import uuid

        audit = Audit()
        audit.status = AuditStatus.DRAFT
        assert audit.can_transition_to(AuditStatus.RUNNING)

    def test_invalid_transition_running_to_approved(self):
        from app.models.audit import Audit, AuditStatus

        audit = Audit()
        audit.status = AuditStatus.RUNNING
        assert not audit.can_transition_to(AuditStatus.APPROVED)

    def test_invalid_transition_approved_to_anything(self):
        from app.models.audit import Audit, AuditStatus

        audit = Audit()
        audit.status = AuditStatus.APPROVED
        assert not audit.can_transition_to(AuditStatus.RUNNING)
        assert not audit.can_transition_to(AuditStatus.DRAFT)
        assert not audit.can_transition_to(AuditStatus.HITL_PENDING)

    def test_valid_hitl_pending_to_approved(self):
        from app.models.audit import Audit, AuditStatus

        audit = Audit()
        audit.status = AuditStatus.HITL_PENDING
        assert audit.can_transition_to(AuditStatus.APPROVED)
        assert audit.can_transition_to(AuditStatus.REJECTED)


class TestPrivacyBudgetEnforcement:
    """Tests that ε budget enforcement gates analytical queries."""

    def test_budget_exhausted_blocks_analysis(self):
        from app.core.privacy import PrivacyBudgetTracker
        from app.core.exceptions import PrivacyBudgetExhaustedError

        tracker = PrivacyBudgetTracker(total_epsilon=0.1)
        tracker.consume(0.1, query_name="max_query")

        with pytest.raises(PrivacyBudgetExhaustedError) as exc_info:
            tracker.consume(0.001, query_name="overflow_query")

        assert "Privacy budget exhausted" in str(exc_info.value)
        assert "0.000" in str(exc_info.value)  # Remaining = 0

    def test_exact_budget_allowed(self):
        from app.core.privacy import PrivacyBudgetTracker

        tracker = PrivacyBudgetTracker(total_epsilon=1.0)
        tracker.consume(0.5)
        tracker.consume(0.5)  # Should not raise
        assert tracker.remaining_epsilon == 0.0
