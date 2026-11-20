"""Health check routes."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health", summary="Check service health")
async def health() -> dict[str, str]:
    """Return a lightweight process health response."""
    return {"status": "ok"}
