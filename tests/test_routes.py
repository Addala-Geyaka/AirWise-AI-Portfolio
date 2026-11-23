"""HTTP boundary tests for health, validation, CORS, and source responses."""

import asyncio
from datetime import UTC, datetime

import httpx
import respx
from fastapi.testclient import TestClient
from starlette.requests import Request

from app.clients.open_meteo import AIR_QUALITY_URL, GEOCODING_URL, WEATHER_URL
from app.clients.photon import PHOTON_SEARCH_URL
from app.main import app, rate_limit_error_handler, validation_error_handler
from app.schemas.planner import PlannerBriefRequest, PlannerBriefResponse


def install_sources() -> None:
    """Install reusable upstream response fixtures."""
    timestamp = datetime.now(UTC).isoformat()
    respx.get(PHOTON_SEARCH_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "features": [
                    {
                        "properties": {
                            "name": "Bengaluru",
                            "city": "Bengaluru",
                            "state": "Karnataka",
                            "country": "India",
                            "osm_key": "place",
                            "osm_value": "city",
                        },
                        "geometry": {"coordinates": [77.5, 12.9]},
                    }
                ]
            },
        )
    )
    respx.get(GEOCODING_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {"name": "Bengaluru", "country": "India", "latitude": 12.9, "longitude": 77.5}
                ]
            },
        )
    )
    respx.get(AIR_QUALITY_URL).mock(
        return_value=httpx.Response(
            200, json={"current": {"time": timestamp, "us_aqi": 40, "pm2_5": 4.3}}
        )
    )
    respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(200, json={"current": {"temperature_2m": 25}})
    )


@respx.mock
def test_health_returns_status_and_security_headers() -> None:
    """Health is lightweight and the API adds baseline security headers."""
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.json() == {"status": "ok"}
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-request-id"]


@respx.mock
def test_place_search_and_air_quality_response() -> None:
    """City search and conditions return source-backed response data."""
    install_sources()
    with TestClient(app) as client:
        places = client.get("/api/v1/places/search", params={"q": "Bengaluru"})
        air = client.get(
            "/api/v1/air-quality",
            params={"latitude": 12.9, "longitude": 77.5, "place_name": "Bengaluru, India"},
        )
    assert places.status_code == 200
    assert places.json()["places"][0]["country"] == "India"
    assert air.status_code == 200
    assert air.json()["source"].startswith("Open-Meteo")
    assert air.json()["aqi"] == 40


@respx.mock
def test_coordinate_and_search_bounds_reject_bad_input() -> None:
    """Coordinates outside WGS84 limits and tiny search terms are rejected."""
    with TestClient(app) as client:
        bad_coordinate = client.get(
            "/api/v1/air-quality", params={"latitude": 100, "longitude": 77, "place_name": "City"}
        )
        bad_search = client.get("/api/v1/places/search", params={"q": "x"})
    assert bad_coordinate.status_code == 422
    assert bad_search.status_code == 422
    assert "latitude" not in bad_coordinate.text


@respx.mock
def test_cors_is_allowlisted() -> None:
    """Known local development origin receives CORS, arbitrary origin does not."""
    with TestClient(app) as client:
        allowed = client.get("/health", headers={"Origin": "http://localhost:5173"})
        rejected = client.get("/health", headers={"Origin": "https://attacker.example"})
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert rejected.headers.get("access-control-allow-origin") is None


@respx.mock
def test_request_body_size_limit() -> None:
    """Oversized declared bodies fail before reaching a route handler."""
    with TestClient(app) as client:
        response = client.post("/health", headers={"content-length": "20000"}, content=b"")
    assert response.status_code == 413


@respx.mock
def test_place_search_uses_geocoder_when_photon_returns_no_matches() -> None:
    """The secondary geocoder supplies results when Photon has no matches."""
    respx.get(PHOTON_SEARCH_URL).mock(return_value=httpx.Response(200, json={"features": []}))
    respx.get(GEOCODING_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {"name": "Bengaluru", "country": "India", "latitude": 12.9, "longitude": 77.5}
                ]
            },
        )
    )
    with TestClient(app) as client:
        response = client.get("/api/v1/places/search", params={"q": "Bengaluru"})
    assert response.status_code == 200
    assert response.json()["places"][0]["name"] == "Bengaluru"


@respx.mock
def test_place_search_failure_is_sanitized_when_both_sources_fail() -> None:
    """Failures from both location providers become a generic 503 response."""
    respx.get(PHOTON_SEARCH_URL).mock(return_value=httpx.Response(503))
    respx.get(GEOCODING_URL).mock(return_value=httpx.Response(503))
    with TestClient(app) as client:
        response = client.get("/api/v1/places/search", params={"q": "Bengaluru"})
    assert response.status_code == 503
    assert response.json() == {"detail": "Location search is temporarily unavailable."}


@respx.mock
def test_place_search_rejects_whitespace_after_trimming() -> None:
    """Whitespace-only searches fail after normalization, before provider calls."""
    with TestClient(app) as client:
        response = client.get("/api/v1/places/search", params={"q": "  "})
    assert response.status_code == 422
    assert response.json()["detail"] == "Search with at least two characters."


@respx.mock
def test_air_quality_source_failure_returns_generic_503() -> None:
    """The air route hides upstream status details when required data fails."""
    respx.get(AIR_QUALITY_URL).mock(return_value=httpx.Response(503))
    respx.get(WEATHER_URL).mock(return_value=httpx.Response(200, json={"current": {}}))
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/air-quality",
            params={"latitude": 12.9, "longitude": 77.5, "place_name": "Bengaluru"},
        )
    assert response.status_code == 503
    assert response.json() == {"detail": "Air quality data is temporarily unavailable."}


def test_error_handlers_return_safe_fallbacks() -> None:
    """Unexpected handler exceptions produce generic, non-reflective responses."""
    request = Request({"type": "http"})
    validation_response = asyncio.run(validation_error_handler(request, ValueError("private")))
    rate_limit_response = asyncio.run(rate_limit_error_handler(request, ValueError("private")))
    assert validation_response.status_code == 400
    assert validation_response.body == b'{"detail":"The request is invalid."}'
    assert rate_limit_response.status_code == 429
    assert rate_limit_response.body == b'{"detail":"Too many requests."}'


def test_planner_endpoint_returns_typed_brief() -> None:
    """The planner route passes validated input to its service and returns the contract."""

    class StubPlanner:
        async def create_brief(self, data: PlannerBriefRequest) -> PlannerBriefResponse:
            assert data.aqi == 42
            return PlannerBriefResponse(brief="Check local conditions.", provider="rules")

    with TestClient(app) as client:
        client.app.state.planner = StubPlanner()
        response = client.post("/api/v1/planner/brief", json={"aqi": 42, "forecast": []})
    assert response.status_code == 200
    assert response.json() == {"brief": "Check local conditions.", "provider": "rules"}
