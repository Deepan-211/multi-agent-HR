"""
PayParity — Differential Privacy Unit Tests
Tests for DP mechanisms, budget tracking, and anonymization gate.
"""
import pytest
import numpy as np

from app.core.privacy import (
    DifferentialPrivacy,
    PrivacyBudgetTracker,
    check_anonymization,
    laplace_noise_scale,
    gaussian_noise_sigma,
)
from app.core.exceptions import PrivacyBudgetExhaustedError


class TestLaplaceMechanism:
    def test_noise_scale_formula(self):
        """b = Δf / ε"""
        scale = laplace_noise_scale(sensitivity=1.0, epsilon=1.0)
        assert scale == 1.0

        scale = laplace_noise_scale(sensitivity=2.0, epsilon=0.5)
        assert scale == 4.0

    def test_invalid_epsilon_raises(self):
        with pytest.raises(ValueError):
            laplace_noise_scale(sensitivity=1.0, epsilon=0)

    def test_laplace_noise_is_unbiased(self):
        """Mean of 10,000 Laplace noise samples should be close to 0."""
        np.random.seed(42)
        noises = [
            DifferentialPrivacy.add_laplace_noise(0.0, sensitivity=1.0, epsilon=1.0)
            for _ in range(10000)
        ]
        assert abs(np.mean(noises)) < 0.1  # Should be near 0

    def test_higher_epsilon_less_noise(self):
        """Higher ε → smaller scale → less noise."""
        np.random.seed(42)
        low_eps_variance = np.var([
            DifferentialPrivacy.add_laplace_noise(100.0, 1.0, 0.1)
            for _ in range(500)
        ])
        high_eps_variance = np.var([
            DifferentialPrivacy.add_laplace_noise(100.0, 1.0, 10.0)
            for _ in range(500)
        ])
        assert low_eps_variance > high_eps_variance

    def test_privatize_count_is_non_negative(self):
        for _ in range(100):
            result = DifferentialPrivacy.privatize_count(10, sensitivity=1.0, epsilon=1.0)
            assert result >= 0

    def test_privatize_mean_within_bounds(self):
        values = [80.0, 90.0, 100.0, 110.0, 120.0]
        mean = DifferentialPrivacy.privatize_mean(values, clip_bound=200.0, epsilon=1.0)
        # Noisy but should be in a reasonable range (with high variance)
        assert -1000 < mean < 1000

    def test_privatize_histogram_non_negative(self):
        hist = {"A": 100, "B": 50, "C": 30}
        dp_hist = DifferentialPrivacy.privatize_histogram(hist, epsilon=1.0)
        for v in dp_hist.values():
            assert v >= 0


class TestPrivacyBudgetTracker:
    def test_initial_state(self):
        tracker = PrivacyBudgetTracker(total_epsilon=1.0)
        assert tracker.remaining_epsilon == 1.0
        assert tracker.consumed_epsilon == 0.0

    def test_consume_updates_remaining(self):
        tracker = PrivacyBudgetTracker(total_epsilon=1.0)
        tracker.consume(0.3, query_name="test_query")
        assert abs(tracker.consumed_epsilon - 0.3) < 1e-10
        assert abs(tracker.remaining_epsilon - 0.7) < 1e-10

    def test_over_budget_raises(self):
        tracker = PrivacyBudgetTracker(total_epsilon=0.5)
        tracker.consume(0.4, query_name="q1")
        with pytest.raises(PrivacyBudgetExhaustedError):
            tracker.consume(0.2, query_name="q2")  # 0.4 + 0.2 > 0.5

    def test_can_afford(self):
        tracker = PrivacyBudgetTracker(total_epsilon=1.0)
        tracker.consume(0.7)
        assert tracker.can_afford(0.3)
        assert not tracker.can_afford(0.31)

    def test_summary_structure(self):
        tracker = PrivacyBudgetTracker(total_epsilon=2.0)
        tracker.consume(0.5, query_name="regression")
        tracker.consume(0.3, query_name="count")
        summary = tracker.summary()
        assert summary["total_epsilon"] == 2.0
        assert abs(summary["consumed_epsilon"] - 0.8) < 1e-10
        assert summary["query_count"] == 2
        assert len(summary["queries"]) == 2


class TestAnonymizationGate:
    def test_clean_text_passes(self):
        text = "Employee EMP_001 demonstrated strong analytical skills this quarter."
        is_clean, violations = check_anonymization(text)
        assert is_clean
        assert len(violations) == 0

    def test_email_detected(self):
        text = "john.doe@company.com provided excellent work."
        is_clean, violations = check_anonymization(text)
        assert not is_clean
        assert any("PII pattern" in v for v in violations)

    def test_ssn_detected(self):
        text = "Employee SSN 123-45-6789 was reviewed."
        is_clean, violations = check_anonymization(text)
        assert not is_clean

    def test_anonymized_tokens_pass(self):
        text = (
            "Token EMP_X99 performed well in Q3. "
            "Their manager MGR_M01 noted consistent improvements. "
            "Department code ENGINEERING shows strong results."
        )
        is_clean, violations = check_anonymization(text)
        assert is_clean
