"""
PayParity — Celery Audit Worker Tasks
Runs the multi-agent swarm in the background and persists results to DB.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

import structlog
from celery import shared_task
from sqlalchemy import create_engine, select, update
from sqlalchemy.orm import Session

from app.config import settings
from app.workers.celery_app import celery_app

logger = structlog.get_logger(__name__)


def _get_sync_session():
    """Create a synchronous DB session for Celery workers."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(settings.SYNC_DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()

def make_json_serializable(obj):
    import numpy as np
    if isinstance(obj, dict):
        return {k: make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [make_json_serializable(item) for item in obj]
    elif isinstance(obj, (np.integer, np.floating, np.bool_)):
        return obj.item()
    elif isinstance(obj, np.ndarray):
        return make_json_serializable(obj.tolist())
    return obj


@celery_app.task(
    name="app.workers.audit_worker.run_audit_swarm",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def run_audit_swarm(self, audit_id: str, organization_id: str):
    """
    Main background task: loads audit data, runs agent swarm, persists results.
    """
    logger.info("audit_worker.start", audit_id=audit_id, task_id=self.request.id)

    from app.models.audit import Audit, AuditStatus
    from app.models.agent_run import AgentRun, AgentRunStatus
    from app.models.bias_flag import BiasFlag, BiasType, BiasSeverity
    from app.models.counterfactual import CounterfactualExperiment
    from app.models.equity_recommendation import EquityRecommendation, RecommendationStatus
    from app.models.privacy_budget import PrivacyBudgetRecord
    from app.models.audit_log import AuditLog
    from app.models.performance_review import PerformanceReview
    from app.models.salary_record import SalaryRecord, PromotionRecord
    from app.agents.orchestrator import get_swarm_runner

    db = _get_sync_session()

    try:
        # ── 1. Load audit ──────────────────────────────────────────────────────
        audit = db.get(Audit, uuid.UUID(audit_id))
        if not audit:
            logger.error("audit_not_found", audit_id=audit_id)
            return

        # Update status → running
        audit.status = AuditStatus.RUNNING
        audit.started_at = datetime.now(timezone.utc)
        audit.celery_task_id = self.request.id
        db.commit()

        # ── 2. Load data from DB ───────────────────────────────────────────────
        reviews = db.execute(
            select(PerformanceReview).where(
                PerformanceReview.audit_id == uuid.UUID(audit_id)
            )
        ).scalars().all()

        salary_recs = db.execute(
            select(SalaryRecord).where(
                SalaryRecord.audit_id == uuid.UUID(audit_id)
            )
        ).scalars().all()

        promo_recs = db.execute(
            select(PromotionRecord).where(
                PromotionRecord.audit_id == uuid.UUID(audit_id)
            )
        ).scalars().all()

        def review_to_dict(r):
            return {
                "id": str(r.id),
                "employee_token": r.employee_token,
                "manager_token": r.manager_token,
                "review_text": r.review_text,
                "performance_rating": r.performance_rating,
                "department_code": r.department_code,
                "role_level": r.role_level,
                "tenure_band": r.tenure_band,
                "gender_group": r.gender_group,
                "ethnicity_group": r.ethnicity_group,
            }

        def salary_to_dict(r):
            return {
                "id": str(r.id),
                "employee_token": r.employee_token,
                "base_salary": r.base_salary,
                "role_level": r.role_level,
                "department_code": r.department_code,
                "tenure_years": r.tenure_years,
                "performance_rating": r.performance_rating,
                "gender_group": r.gender_group,
                "ethnicity_group": r.ethnicity_group,
                "location_region": r.location_region,
                "market_p50_salary": r.market_p50_salary,
            }

        def promo_to_dict(r):
            return {
                "employee_token": r.employee_token,
                "gender_group": r.gender_group,
                "ethnicity_group": r.ethnicity_group,
                "promotion_year": r.promotion_year,
            }

        reviews_dicts = [review_to_dict(r) for r in reviews]
        salary_dicts = [salary_to_dict(r) for r in salary_recs]
        promo_dicts = [promo_to_dict(r) for r in promo_recs]

        # ── 3. Run agent swarm ─────────────────────────────────────────────────
        runner = get_swarm_runner()
        budget_config = audit.audit_config or {}
        raw_final_state = runner.run(
            audit_id=audit_id,
            organization_id=organization_id,
            reviews=reviews_dicts,
            salary_records=salary_dicts,
            promotion_records=promo_dicts,
            allocated_epsilon=audit.allocated_epsilon,
            budget_constraint_usd=float(budget_config.get("budget_constraint", 500_000)),
        )
        
        # Convert numpy types to native Python types for JSON serialization
        final_state = make_json_serializable(raw_final_state)

        # ── 4. Persist agent results ───────────────────────────────────────────
        agent_names = [
            "review_parser", "compensation_analytics", "counterfactual_audit", "equity_framework"
        ]

        # Build per-agent traces
        per_agent_traces = {name: [] for name in agent_names}
        for step in final_state.get("reasoning_trace", []):
            agent = step.get("agent", "")
            if agent in per_agent_traces:
                per_agent_traces[agent].append(step)

        agent_run_map = {}
        for agent_name in agent_names:
            agent_run = AgentRun(
                audit_id=uuid.UUID(audit_id),
                organization_id=uuid.UUID(organization_id),
                agent_name=agent_name,
                status=AgentRunStatus.COMPLETED,
                reasoning_trace=per_agent_traces.get(agent_name, []),
                output={},
                epsilon_consumed=0.0,
                started_at=audit.started_at,
                completed_at=datetime.now(timezone.utc),
            )
            db.add(agent_run)
            db.flush()
            agent_run_map[agent_name] = agent_run.id

        # ── 5. Persist bias flags ──────────────────────────────────────────────
        for bf in final_state.get("bias_evidence", []):
            flag = BiasFlag(
                audit_id=uuid.UUID(audit_id),
                organization_id=uuid.UUID(organization_id),
                agent_run_id=agent_run_map.get("review_parser"),
                employee_token=bf.get("employee_token"),
                bias_type=bf.get("bias_type", "gendered_language"),
                severity=bf.get("severity", "medium"),
                confidence=bf.get("confidence", 0.5),
                evidence_text=bf.get("evidence_text", ""),
                flagged_phrases=bf.get("flagged_phrases", []),
                explanation=bf.get("explanation", ""),
                dp_noise_applied=True,
                dp_epsilon_used=0.02,
            )
            db.add(flag)

        # ── 6. Persist pay gap results via summary ─────────────────────────────
        # (stored in audit.summary_results, not as individual rows)
        summary = final_state.get("summary", {})
        summary["pay_gap_results"] = final_state.get("pay_gap_results", [])
        summary["counterfactual_results"] = final_state.get("counterfactual_results", [])
        summary["errors"] = final_state.get("errors", [])

        # ── 7. Persist counterfactual experiments ──────────────────────────────
        for cf in final_state.get("counterfactual_results", []):
            experiment = CounterfactualExperiment(
                audit_id=uuid.UUID(audit_id),
                organization_id=uuid.UUID(organization_id),
                agent_run_id=agent_run_map.get("counterfactual_audit"),
                attribute_swapped=cf.get("attribute_swapped", "gender_group"),
                from_group=cf.get("from_group", "G1"),
                to_group=cf.get("to_group", "G2"),
                rating_delta=cf.get("rating_delta", 0.0),
                effect_size_cohens_d=cf.get("effect_size", 0.0),
                p_value=cf.get("p_value", 1.0),
                is_statistically_significant=cf.get("is_significant", False),
                interpretation=cf.get("interpretation", ""),
                dp_epsilon_used=0.05,
            )
            db.add(experiment)

        # ── 8. Persist equity recommendations ─────────────────────────────────
        for adj in final_state.get("equity_adjustments", []):
            rec = EquityRecommendation(
                audit_id=uuid.UUID(audit_id),
                organization_id=uuid.UUID(organization_id),
                agent_run_id=agent_run_map.get("equity_framework"),
                status=RecommendationStatus.PENDING_HITL,
                target_scope=adj.get("target_scope", ""),
                affected_group=adj.get("affected_group", ""),
                identified_gap_pct=adj.get("gap_pct", 0.0),
                recommended_adjustment_pct=adj.get("recommended_adjustment_pct", 0.0),
                recommended_adjustment_total_usd=adj.get("estimated_cost_usd", 0.0),
                priority_score=adj.get("priority_score", 0.0),
                action_plan=adj.get("action_plan", {}),
                hitl_required=True,
            )
            db.add(rec)

        # ── 9. Record privacy budget consumption ──────────────────────────────
        epsilon_used = final_state.get("consumed_epsilon", 0.0)
        pb_record = PrivacyBudgetRecord(
            organization_id=uuid.UUID(organization_id),
            audit_id=uuid.UUID(audit_id),
            query_name="full_swarm_run",
            epsilon_consumed=epsilon_used,
            mechanism="laplace_composite",
            cumulative_epsilon_audit=epsilon_used,
            cumulative_epsilon_org=epsilon_used,
            budget_total=audit.allocated_epsilon,
            budget_remaining=audit.allocated_epsilon - epsilon_used,
        )
        db.add(pb_record)

        # ── 10. Update audit to agents_completed → hitl_pending ───────────────
        audit.status = AuditStatus.HITL_PENDING
        audit.completed_at = datetime.now(timezone.utc)
        audit.consumed_epsilon = epsilon_used
        audit.summary_results = summary

        # Audit log
        log_entry = AuditLog(
            organization_id=uuid.UUID(organization_id),
            audit_id=uuid.UUID(audit_id),
            event_type="audit.swarm_completed",
            description=f"Agent swarm completed. {len(final_state.get('equity_adjustments', []))} recommendations generated.",
            event_data={
                "bias_flags": len(final_state.get("bias_evidence", [])),
                "pay_gaps": len(final_state.get("pay_gap_results", [])),
                "recommendations": len(final_state.get("equity_adjustments", [])),
                "epsilon_consumed": epsilon_used,
            },
        )
        db.add(log_entry)

        db.commit()
        logger.info("audit_worker.complete", audit_id=audit_id,
                    flags=len(final_state.get("bias_evidence", [])),
                    recommendations=len(final_state.get("equity_adjustments", [])))

    except Exception as exc:
        db.rollback()
        logger.error("audit_worker.failed", audit_id=audit_id, error=str(exc))

        # Mark audit as failed
        try:
            from app.models.audit import Audit, AuditStatus
            audit = db.get(Audit, uuid.UUID(audit_id))
            if audit:
                audit.status = AuditStatus.FAILED
                db.commit()
        except Exception:
            pass

        raise self.retry(exc=exc, countdown=60)

    finally:
        db.close()


@celery_app.task(name="app.workers.audit_worker.snapshot_observability_metrics")
def snapshot_observability_metrics():
    """Periodic task: snapshot current observability metrics."""
    from app.models.observability_metric import ObservabilityMetric
    from app.models.audit import Audit, AuditStatus
    from app.models.equity_recommendation import EquityRecommendation, RecommendationStatus

    db = _get_sync_session()
    try:
        now = datetime.now(timezone.utc)

        # Count pending HITL
        hitl_count = db.query(EquityRecommendation).filter(
            EquityRecommendation.status == RecommendationStatus.PENDING_HITL
        ).count()

        # Count active audits
        active_audits = db.query(Audit).filter(
            Audit.status == AuditStatus.RUNNING
        ).count()

        for name, value, unit in [
            ("hitl_pending_count", hitl_count, "count"),
            ("active_audit_count", active_audits, "count"),
        ]:
            metric = ObservabilityMetric(
                metric_name=name,
                metric_value=float(value),
                metric_unit=unit,
                recorded_at=now,
            )
            db.add(metric)

        db.commit()
        logger.info("metrics_snapshot", hitl_pending=hitl_count, active=active_audits)
    except Exception as e:
        logger.error("metrics_snapshot_error", error=str(e))
    finally:
        db.close()
