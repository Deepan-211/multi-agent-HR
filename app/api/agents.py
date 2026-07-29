"""
PayParity — Agents API
Real-time agent status, reasoning traces, and SSE streaming.
"""
import asyncio
import json
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.core.auth import get_current_user, CurrentUser
from app.database import get_db
from app.models.agent_run import AgentRun
from app.models.audit import Audit

router = APIRouter()


class AgentRunResponse(BaseModel):
    id: str
    audit_id: str
    agent_name: str
    status: str
    epsilon_consumed: float
    reasoning_trace: list
    output: dict | None
    error_message: str | None
    duration_seconds: float | None


@router.get("/audit/{audit_id}", response_model=list[AgentRunResponse])
async def get_agent_runs(
    audit_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get all agent runs for an audit with reasoning traces."""
    # Verify audit ownership
    audit = await db.get(Audit, uuid.UUID(audit_id))
    if not audit or str(audit.organization_id) != current_user.org_id:
        raise HTTPException(status_code=404, detail="Audit not found")

    result = await db.execute(
        select(AgentRun).where(AgentRun.audit_id == uuid.UUID(audit_id))
    )
    runs = result.scalars().all()

    return [
        AgentRunResponse(
            id=str(r.id),
            audit_id=str(r.audit_id),
            agent_name=r.agent_name,
            status=r.status.value,
            epsilon_consumed=r.epsilon_consumed,
            reasoning_trace=r.reasoning_trace or [],
            output=r.output,
            error_message=r.error_message,
            duration_seconds=r.duration_seconds,
        )
        for r in runs
    ]


@router.get("/audit/{audit_id}/stream")
async def stream_agent_activity(
    audit_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Server-Sent Events stream for live agent activity.
    Polls DB every 2 seconds and pushes updates.
    """
    audit = await db.get(Audit, uuid.UUID(audit_id))
    if not audit or str(audit.organization_id) != current_user.org_id:
        raise HTTPException(status_code=404, detail="Audit not found")

    async def event_generator() -> AsyncGenerator[dict, None]:
        last_step_count = 0

        while True:
            if await request.is_disconnected():
                break

            # Re-query to get latest state
            async with db.begin_nested():
                fresh_audit = await db.get(Audit, uuid.UUID(audit_id))
                runs_result = await db.execute(
                    select(AgentRun).where(AgentRun.audit_id == uuid.UUID(audit_id))
                )
                runs = runs_result.scalars().all()

            all_steps = []
            for run in runs:
                for step in (run.reasoning_trace or []):
                    step["_agent"] = run.agent_name
                    all_steps.append(step)

            new_steps = all_steps[last_step_count:]
            if new_steps:
                last_step_count = len(all_steps)
                yield {
                    "event": "agent_steps",
                    "data": json.dumps({"steps": new_steps, "audit_status": fresh_audit.status.value}),
                }

            # Status update
            yield {
                "event": "status",
                "data": json.dumps({
                    "audit_status": fresh_audit.status.value,
                    "epsilon_consumed": fresh_audit.consumed_epsilon,
                    "completed_agents": [r.agent_name for r in runs if r.status.value == "completed"],
                }),
            }

            if fresh_audit.status.value in ["approved", "rejected", "failed"]:
                yield {"event": "complete", "data": json.dumps({"status": fresh_audit.status.value})}
                break

            await asyncio.sleep(2)

    return EventSourceResponse(event_generator())
