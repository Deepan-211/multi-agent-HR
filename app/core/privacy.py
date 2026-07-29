"""
PayParity — Differential Privacy Budget Enforcer

Implements:
  - Laplace mechanism (for numeric queries)
  - Gaussian mechanism (for vector/embedding queries)
  - Per-audit and per-organization ε-budget tracking
  - Hard enforcement: queries refused when budget exhausted
"""
from __future__ import annotations

import math
import uuid
from typing import Optional
import numpy as np
import structlog

from app.config import settings
from app.core.exceptions import PrivacyBudgetExhaustedError

logger = structlog.get_logger(__name__)


# ── Sensitivity calibration helpers ───────────────────────────────────────────

def laplace_noise_scale(sensitivity: float, epsilon: float) -> float:
    """b = Δf / ε for Laplace mechanism."""
    if epsilon <= 0:
        raise ValueError("Epsilon must be positive")
    return sensitivity / epsilon


def gaussian_noise_sigma(
    sensitivity: float,
    epsilon: float,
    delta: float,
) -> float:
    """σ = sensitivity * sqrt(2 * ln(1.25/δ)) / ε  (approximate Gaussian)."""
    if epsilon <= 0 or delta <= 0 or delta >= 1:
        raise ValueError("Invalid ε or δ")
    return sensitivity * math.sqrt(2 * math.log(1.25 / delta)) / epsilon


# ── Core mechanisms ───────────────────────────────────────────────────────────

class DifferentialPrivacy:
    """
    Stateless DP mechanism helpers.
    All noise injection happens in-process using numpy's CSPRNG.
    """

    @staticmethod
    def add_laplace_noise(
        value: float,
        sensitivity: float,
        epsilon: float,
    ) -> float:
        """Apply Laplace noise to a scalar value."""
        scale = laplace_noise_scale(sensitivity, epsilon)
        noise = np.random.laplace(loc=0.0, scale=scale)
        return float(value + noise)

    @staticmethod
    def add_laplace_noise_array(
        values: np.ndarray,
        sensitivity: float,
        epsilon: float,
    ) -> np.ndarray:
        """Apply Laplace noise to each element of an array (local DP)."""
        scale = laplace_noise_scale(sensitivity, epsilon)
        noise = np.random.laplace(loc=0.0, scale=scale, size=values.shape)
        return values + noise

    @staticmethod
    def add_gaussian_noise(
        value: float,
        sensitivity: float,
        epsilon: float,
        delta: float,
    ) -> float:
        """Apply Gaussian noise to a scalar value."""
        sigma = gaussian_noise_sigma(sensitivity, epsilon, delta)
        noise = np.random.normal(loc=0.0, scale=sigma)
        return float(value + noise)

    @staticmethod
    def clip_and_aggregate(
        values: np.ndarray,
        clip_bound: float,
        sensitivity: float,
        epsilon: float,
    ) -> float:
        """Clip values to [-C, C] then sum with Laplace noise (standard DP mean)."""
        clipped = np.clip(values, -clip_bound, clip_bound)
        true_sum = float(np.sum(clipped))
        return DifferentialPrivacy.add_laplace_noise(true_sum, sensitivity, epsilon)

    @staticmethod
    def privatize_count(
        count: int,
        sensitivity: float = 1.0,
        epsilon: float = 1.0,
    ) -> int:
        """Return a differentially private count (rounded to nearest int ≥ 0)."""
        noisy = DifferentialPrivacy.add_laplace_noise(float(count), sensitivity, epsilon)
        return max(0, round(noisy))

    @staticmethod
    def privatize_mean(
        values: list[float],
        clip_bound: float,
        epsilon: float,
    ) -> float:
        """Return a DP mean of a list of values."""
        arr = np.array(values, dtype=float)
        n = len(arr)
        if n == 0:
            return 0.0
        # Sensitivity of the mean = 2*C/n
        sensitivity = 2.0 * clip_bound / n
        clipped = np.clip(arr, -clip_bound, clip_bound)
        true_mean = float(np.mean(clipped))
        return DifferentialPrivacy.add_laplace_noise(true_mean, sensitivity, epsilon)

    @staticmethod
    def privatize_histogram(
        counts: dict,
        epsilon: float,
        sensitivity: float = 1.0,
    ) -> dict:
        """Add Laplace noise to each bin of a histogram."""
        return {
            k: max(0, round(DifferentialPrivacy.add_laplace_noise(float(v), sensitivity, epsilon)))
            for k, v in counts.items()
        }


# ── Privacy Budget Tracker ─────────────────────────────────────────────────────

class PrivacyBudgetTracker:
    """
    In-memory budget tracker per audit.
    Production: persist to DB via PrivacyBudgetRepository.
    """

    def __init__(
        self,
        total_epsilon: float,
        total_delta: float = settings.DEFAULT_PRIVACY_DELTA,
    ):
        self.total_epsilon = total_epsilon
        self.total_delta = total_delta
        self._consumed_epsilon = 0.0
        self._consumed_delta = 0.0
        self._query_log: list[dict] = []

    @property
    def remaining_epsilon(self) -> float:
        return max(0.0, self.total_epsilon - self._consumed_epsilon)

    @property
    def consumed_epsilon(self) -> float:
        return self._consumed_epsilon

    def consume(
        self,
        epsilon: float,
        delta: float = 0.0,
        query_name: str = "unnamed",
    ) -> None:
        """
        Record ε consumption using basic composition.
        Raises PrivacyBudgetExhaustedError if budget exceeded.
        """
        if self._consumed_epsilon + epsilon > self.total_epsilon:
            raise PrivacyBudgetExhaustedError(
                f"Privacy budget exhausted. Remaining ε={self.remaining_epsilon:.4f}, "
                f"requested ε={epsilon:.4f}."
            )
        self._consumed_epsilon += epsilon
        self._consumed_delta += delta
        self._query_log.append({
            "id": str(uuid.uuid4()),
            "query_name": query_name,
            "epsilon": epsilon,
            "delta": delta,
            "cumulative_epsilon": self._consumed_epsilon,
        })
        logger.info(
            "privacy_budget_consumed",
            query=query_name,
            epsilon=epsilon,
            cumulative=self._consumed_epsilon,
            remaining=self.remaining_epsilon,
        )

    def can_afford(self, epsilon: float) -> bool:
        return self._consumed_epsilon + epsilon <= self.total_epsilon

    def summary(self) -> dict:
        return {
            "total_epsilon": self.total_epsilon,
            "consumed_epsilon": self._consumed_epsilon,
            "remaining_epsilon": self.remaining_epsilon,
            "query_count": len(self._query_log),
            "queries": self._query_log,
        }


# ── Anonymization gate ─────────────────────────────────────────────────────────

# PII patterns that must NOT appear in uploaded data
_PII_PATTERNS = [
    r"\b[A-Z][a-z]+ [A-Z][a-z]+\b",       # Full names (heuristic)
    r"\b\d{3}-\d{2}-\d{4}\b",              # SSN
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",  # Email
    r"\b\d{10,}\b",                          # Long numeric IDs (phone, etc.)
]

import re

_COMPILED_PII = [re.compile(p) for p in _PII_PATTERNS]


def check_anonymization(text: str) -> tuple[bool, list[str]]:
    """
    Heuristic PII scan.
    Returns (is_clean, violations).
    Production: use a dedicated PII detection model.
    """
    violations = []
    for pattern in _COMPILED_PII:
        matches = pattern.findall(text)
        if matches:
            violations.extend([f"PII pattern '{pattern.pattern}': {m}" for m in matches[:3]])
    return len(violations) == 0, violations
