"""Tests for Photon response mapping, filtering, and safe failures."""

import httpx
import pytest
import respx

from app.clients.open_meteo import UpstreamError
from app.clients.photon import PHOTON_SEARCH_URL, PhotonClient


def feature(name: str | None, value: str, coordinates: list[float]) -> dict[str, object]:
    """Build a small Photon feature for mapping tests."""
    return {
        "properties": {
            "name": name,
            "city": "City",
            "state": "State",
            "country": "Country",
            "postcode": "12345",
            "osm_value": value,
        },
        "geometry": {"coordinates": coordinates},
    }


@pytest.mark.asyncio
@respx.mock
async def test_photon_maps_feature_types_and_skips_invalid_duplicates() -> None:
    """Named features map to public labels while bad or duplicate points are skipped."""
    unnamed = feature(None, "park", [15.0, 25.0])
    unnamed["properties"] = {"osm_value": "park"}
    respx.get(PHOTON_SEARCH_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "features": [
                    feature("Country", "country", [10.0, 20.0]),
                    feature("State", "state", [11.0, 21.0]),
                    feature("County", "county", [12.0, 22.0]),
                    feature("Town", "town", [13.0, 23.0]),
                    feature("Park", "park", [14.0, 24.0]),
                    feature("Town", "town", [13.0, 23.0]),
                    unnamed,
                    feature("Outside bounds", "city", [200.0, 95.0]),
                ]
            },
        )
    )
    async with httpx.AsyncClient() as http:
        places = await PhotonClient(http).search_places("somewhere")
    assert [place.feature_code for place in places] == ["PCLI", "ADM1", "ADM2", "PPL", "LOC"]
    assert places[3].city == "City"
    assert places[3].postcode == "12345"


@pytest.mark.asyncio
@respx.mock
async def test_photon_malformed_payload_is_a_typed_upstream_error() -> None:
    """Invalid Photon shapes are translated to the shared upstream error."""
    respx.get(PHOTON_SEARCH_URL).mock(return_value=httpx.Response(200, json={"features": [7]}))
    async with httpx.AsyncClient() as http:
        with pytest.raises(UpstreamError, match="worldwide location search"):
            await PhotonClient(http).search_places("somewhere")


@pytest.mark.asyncio
@respx.mock
async def test_photon_http_failure_is_a_typed_upstream_error() -> None:
    """HTTP failures do not expose upstream details to the caller."""
    respx.get(PHOTON_SEARCH_URL).mock(return_value=httpx.Response(503))
    async with httpx.AsyncClient() as http:
        with pytest.raises(UpstreamError, match="worldwide location search"):
            await PhotonClient(http).search_places("somewhere")
