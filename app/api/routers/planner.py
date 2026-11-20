"""Optional AI planner summary endpoint."""

from fastapi import APIRouter, Request

from app.core.rate_limit import limiter
from app.schemas.planner import PlannerBriefRequest, PlannerBriefResponse
from app.services.planner import GeminiPlanner

router = APIRouter(prefix="/api/v1/planner", tags=["planner"])


@router.post("/brief", response_model=PlannerBriefResponse)
@limiter.limit("12/minute")
async def create_brief(request: Request, data: PlannerBriefRequest) -> PlannerBriefResponse:
    """Return a short model-backed summary or a rule-based fallback."""
    planner: GeminiPlanner = request.app.state.planner
    return await planner.create_brief(data)
