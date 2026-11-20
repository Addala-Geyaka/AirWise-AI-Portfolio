"""Air quality dashboard routes."""

from fastapi import APIRouter, HTTPException, Query, Request

from app.core.rate_limit import limiter
from app.schemas.air_quality import AirQualityResponse
from app.services.air_quality import AirQualityService, ServiceUnavailable

router = APIRouter(prefix="/api/v1/air-quality", tags=["air-quality"])


@router.get("", response_model=AirQualityResponse)
@limiter.limit("30/minute")
async def get_air_quality(
    request: Request,
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    place_name: str = Query(min_length=2, max_length=100),
    force_refresh: bool = Query(default=False),
) -> AirQualityResponse:
    """Return current modelled conditions and a short AQI forecast."""
    service: AirQualityService = request.app.state.air_quality
    try:
        return await service.get_conditions(
            latitude, longitude, place_name, force_refresh=force_refresh
        )
    except ServiceUnavailable as exc:
        raise HTTPException(
            status_code=503, detail="Air quality data is temporarily unavailable."
        ) from exc
