"""
PayParity — Compensation Benchmark API (Mock)
Provides realistic market salary data by job family, level, and region.
Production: connect to Radford, Mercer, Levels.fyi, or Glassdoor API.
"""
from __future__ import annotations

from typing import Optional
import structlog

logger = structlog.get_logger(__name__)


# Market salary benchmarks by job family + level (USD, 2024)
BENCHMARK_DATA = {
    ("software_engineering", "L1"): {"p25": 82000, "p50": 95000, "p75": 110000},
    ("software_engineering", "L2"): {"p25": 100000, "p50": 120000, "p75": 145000},
    ("software_engineering", "L3"): {"p25": 130000, "p50": 155000, "p75": 185000},
    ("software_engineering", "L4"): {"p25": 160000, "p50": 195000, "p75": 235000},
    ("software_engineering", "L5"): {"p25": 195000, "p50": 240000, "p75": 290000},
    ("product_management", "L3"): {"p25": 120000, "p50": 145000, "p75": 175000},
    ("product_management", "L4"): {"p25": 150000, "p50": 185000, "p75": 220000},
    ("data_science", "L2"): {"p25": 95000, "p50": 115000, "p75": 138000},
    ("data_science", "L3"): {"p25": 120000, "p50": 145000, "p75": 175000},
    ("sales", "L2"): {"p25": 70000, "p50": 90000, "p75": 115000},
    ("sales", "L3"): {"p25": 90000, "p50": 115000, "p75": 145000},
    ("hr", "L2"): {"p25": 65000, "p50": 80000, "p75": 100000},
    ("hr", "L3"): {"p25": 85000, "p50": 105000, "p75": 130000},
    ("finance", "L3"): {"p25": 100000, "p50": 125000, "p75": 155000},
    ("design", "L3"): {"p25": 95000, "p50": 118000, "p75": 145000},
}


class CompensationBenchmarkAPI:
    """Mock compensation benchmark API."""

    def get_benchmark(
        self,
        dimension: str,
        job_family: Optional[str] = None,
        level: Optional[str] = None,
    ) -> dict:
        """Return market benchmarks for the given dimension."""
        key = (job_family or "software_engineering", level or "L3")
        data = BENCHMARK_DATA.get(key, {"p25": 90000, "p50": 115000, "p75": 145000})

        return {
            "job_family": job_family or "all",
            "level": level or "all",
            "dimension": dimension,
            "median_salary": data["p50"],
            "p25_salary": data["p25"],
            "p75_salary": data["p75"],
            "gender_benchmark_gap_pct": 7.5,   # Industry average gender gap
            "ethnicity_benchmark_gap_pct": 5.2, # Industry average racial gap
            "data_source": "PayParity Market Benchmark (2024)",
            "currency": "USD",
        }

    def get_market_position(
        self,
        actual_salary: float,
        job_family: str,
        level: str,
    ) -> dict:
        """Calculate compa-ratio and market position."""
        key = (job_family, level)
        benchmarks = BENCHMARK_DATA.get(key, {"p25": 90000, "p50": 115000, "p75": 145000})
        p50 = benchmarks["p50"]
        compa_ratio = actual_salary / p50 if p50 > 0 else 1.0

        position = "below_market" if compa_ratio < 0.90 else (
            "at_market" if compa_ratio < 1.10 else "above_market"
        )

        return {
            "compa_ratio": round(compa_ratio, 3),
            "market_position": position,
            "p50_benchmark": p50,
            "deviation_pct": round((compa_ratio - 1.0) * 100, 2),
        }
