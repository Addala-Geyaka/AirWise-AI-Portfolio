"""OpenStreetMap Photon search for global named locations and addresses."""

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.clients.open_meteo import UpstreamError
from app.schemas.air_quality import Place

PHOTON_SEARCH_URL = "https://photon.komoot.io/api/"


class PhotonModel(BaseModel):
    """Photon payload subset; ignore upstream fields not used by AirWise."""

    model_config = ConfigDict(extra="ignore")


class PhotonProperties(PhotonModel):
    name: str | None = None
    country: str | None = None
    city: str | None = None
    state: str | None = None
    county: str | None = None
    district: str | None = None
    suburb: str | None = None
    locality: str | None = None
    postcode: str | None = None
    type: str | None = None
    osm_key: str | None = None
    osm_value: str | None = None


class PhotonGeometry(PhotonModel):
    coordinates: list[float] = Field(min_length=2)


class PhotonFeature(PhotonModel):
    properties: PhotonProperties
    geometry: PhotonGeometry


class PhotonPayload(PhotonModel):
    features: list[PhotonFeature] = Field(default_factory=list)


class PhotonClient:
    """Search global OpenStreetMap place names and address features."""

    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def search_places(self, query: str) -> list[Place]:
        """Return useful named features with their city, state, and country context."""
        try:
            response = await self._client.get(
                PHOTON_SEARCH_URL,
                params={"q": query, "limit": 20, "lang": "en"},
                headers={"User-Agent": "AirWise AI location search"},
            )
            response.raise_for_status()
            payload = PhotonPayload.model_validate(response.json())
        except (httpx.HTTPError, ValueError, ValidationError) as exc:
            raise UpstreamError("The worldwide location search is unavailable.") from exc

        places: list[Place] = []
        seen: set[tuple[str, float, float]] = set()
        for feature in payload.features:
            properties = feature.properties
            name = (
                properties.name
                or properties.locality
                or properties.city
                or properties.district
                or properties.county
                or properties.state
                or properties.country
            )
            if not name:
                continue
            longitude, latitude = feature.geometry.coordinates[:2]
            place_key = (name.casefold(), latitude, longitude)
            if place_key in seen or not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
                continue
            seen.add(place_key)
            places.append(
                Place(
                    name=name[:100],
                    country=_limit(properties.country, 80),
                    latitude=latitude,
                    longitude=longitude,
                    city=_limit(properties.city, 100),
                    district=_limit(properties.district or properties.suburb, 100),
                    admin1=_limit(properties.state, 100),
                    admin2=_limit(properties.county, 100),
                    postcode=_limit(properties.postcode, 20),
                    feature_code=_feature_code(properties),
                )
            )
        return places


def _limit(value: str | None, length: int) -> str | None:
    """Keep optional upstream labels within the public response bounds."""
    return value[:length] if value else None


def _feature_code(properties: PhotonProperties) -> str:
    """Map Photon feature types to the simple labels used by the search UI."""
    value = (properties.osm_value or properties.type or "").casefold()
    if value == "country":
        return "PCLI"
    if value in {"state", "province", "region"}:
        return "ADM1"
    if value in {"county", "district"}:
        return "ADM2"
    if value in {"city", "town", "village", "hamlet", "municipality", "suburb", "locality"}:
        return "PPL"
    return "LOC"
