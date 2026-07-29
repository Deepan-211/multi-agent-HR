"""
PayParity — Celery Application & Task Definitions
Background worker for long-running agent swarms.
"""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone

import structlog
from celery import Celery
from celery.signals import task_prerun, task_postrun, task_failure

from app.config import settings

logger = structlog.get_logger(__name__)

# ── Celery app ─────────────────────────────────────────────────────────────────
celery_app = Celery(
    "payparity",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.audit_worker"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_soft_time_limit=1800,   # 30 min soft limit
    task_time_limit=3600,         # 1 hour hard limit
    result_expires=86400,         # Results kept 24h
    task_always_eager=True,       # Run synchronously without worker
    task_store_eager_result=True,
    beat_schedule={
        "snapshot-metrics-every-5min": {
            "task": "app.workers.audit_worker.snapshot_observability_metrics",
            "schedule": 300.0,  # 5 minutes
        },
    },
)


# ── Signals ────────────────────────────────────────────────────────────────────
@task_prerun.connect
def task_prerun_handler(task_id, task, *args, **kwargs):
    logger.info("celery_task_started", task_id=task_id, task_name=task.name)


@task_postrun.connect
def task_postrun_handler(task_id, task, state, *args, **kwargs):
    logger.info("celery_task_finished", task_id=task_id, task_name=task.name, state=state)


@task_failure.connect
def task_failure_handler(task_id, exception, traceback, *args, **kwargs):
    logger.error("celery_task_failed", task_id=task_id, error=str(exception))
