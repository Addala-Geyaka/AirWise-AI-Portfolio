"""Tests for the Gemini summary and its deterministic fallback."""

from datetime import UTC, datetime

import httpx
import pytest
from pydantic import SecretStr

from app.schemas.planner import PlannerBriefRequest, PlannerForecastPoint
from app.services.planner import GeminiPlanner, build_fallback_brief


def sample_request() -> PlannerBriefRequest:
    """Build a minimal source-only planning payload."""
    return PlannerBriefRequest(
        aqi=120,
        forecast=[PlannerForecastPoint(time=datetime(2026, 11, 20, 14, tzinfo=UTC), aqi=80)],
    )


@pytest.mark.asyncio
async def test_missing_key_uses_rules_without_an_upstream_request() -> None:
    """The app works with no Gemini key and does not make a network call."""
    async with httpx.AsyncClient() as client:
        planner = GeminiPlanner(client, None, "gemini-2.5-flash")
        result = await planner.create_brief(sample_request())
    assert result.provider == "rules"
    assert "US AQI 120" in result.brief
    assert "2 PM" in result.brief


@pytest.mark.asyncio
async def test_empty_key_uses_rules_without_an_upstream_request() -> None:
    """A blank environment variable is treated as no configured key."""
    async with httpx.AsyncClient() as client:
        planner = GeminiPlanner(client, SecretStr(""), "gemini-2.5-flash")
        result = await planner.create_brief(sample_request())
    assert result.provider == "rules"


@pytest.mark.asyncio
async def test_configured_gemini_uses_server_key_and_returns_plain_text() -> None:
    """The Gemini key is sent only in the server-side request header."""

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "generativelanguage.googleapis.com"
        assert request.headers["x-goog-api-key"] == "server-secret"
        assert "contents" in request.content.decode()
        return httpx.Response(
            200,
            json={
                "candidates": [{"content": {"parts": [{"text": "Review the modelled forecast."}]}}]
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        planner = GeminiPlanner(client, SecretStr("server-secret"), "gemini-2.5-flash")
        result = await planner.create_brief(sample_request())
    assert result.provider == "gemini"
    assert result.brief == "Review the modelled forecast."


@pytest.mark.asyncio
async def test_upstream_error_falls_back_without_leaking_provider_details() -> None:
    """A failed Gemini call preserves the safe rule-based experience."""

    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(503, json={"error": {"message": "private provider detail"}})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        planner = GeminiPlanner(client, SecretStr("server-secret"), "gemini-2.5-flash")
        result = await planner.create_brief(sample_request())
    assert result.provider == "rules"
    assert "private provider detail" not in result.brief


@pytest.mark.asyncio
async def test_empty_gemini_candidates_use_safe_fallback() -> None:
    """A successful but empty model payload does not produce an empty brief."""
    transport = httpx.MockTransport(lambda _: httpx.Response(200, json={"candidates": []}))
    async with httpx.AsyncClient(transport=transport) as client:
        planner = GeminiPlanner(client, SecretStr("server-secret"), "gemini-2.5-flash")
        result = await planner.create_brief(sample_request())
    assert result.provider == "rules"
    assert "US AQI 120" in result.brief


@pytest.mark.asyncio
async def test_gemini_output_is_normalized_and_bounded() -> None:
    """Model text is whitespace-normalized and kept within the public response limit."""
    long_text = "  " + ("Use the forecast.\x00 " * 60)
    transport = httpx.MockTransport(
        lambda _: httpx.Response(
            200,
            json={"candidates": [{"content": {"parts": [{"text": long_text}]}}]},
        )
    )
    async with httpx.AsyncClient(transport=transport) as client:
        planner = GeminiPlanner(client, SecretStr("server-secret"), "gemini-2.5-flash")
        result = await planner.create_brief(sample_request())
    assert result.provider == "gemini"
    assert "\x00" not in result.brief
    assert "  " not in result.brief
    assert len(result.brief) <= 400


def test_rules_cover_good_and_unavailable_readings() -> None:
    """Rule summaries avoid filling in missing values and handle the Good band."""
    good = PlannerBriefRequest(aqi=30)
    missing = PlannerBriefRequest(aqi=None)
    no_forecast = PlannerBriefRequest(aqi=120)
    assert "Good range" in build_fallback_brief(good)
    assert "unavailable" in build_fallback_brief(missing)
    assert "Check the forecast" in build_fallback_brief(no_forecast)
