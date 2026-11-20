"""Place search routes."""

from fastapi import APIRouter, HTTPException, Query, Request

from app.clients.open_meteo import OpenMeteoClient, UpstreamError
from app.core.rate_limit import limiter
from app.schemas.air_quality import PlaceSearchResponse

router = APIRouter(prefix="/api/v1/places", tags=["places"])


@router.get("/search", response_model=PlaceSearchResponse)
@limiter.limit("30/minute")
async def search_places(
    request: Request,
    q: str = Query(min_length=2, max_length=100),
) -> PlaceSearchResponse:
    """Search OpenStreetMap first and use the global geocoder as a fallback."""
    query = q.strip()
    if len(query) < 2:
        raise HTTPException(status_code=422, detail="Search with at least two characters.")
    photon = request.app.state.photon
    try:
        places = await photon.search_places(query)
    except UpstreamError:
        places = []
    if not places:
        try:
            geocoder: OpenMeteoClient = request.app.state.open_meteo
            places = await geocoder.search_places(query)
        except UpstreamError as exc:
            raise HTTPException(
                status_code=503, detail="Location search is temporarily unavailable."
            ) from exc
    return PlaceSearchResponse(places=places)
