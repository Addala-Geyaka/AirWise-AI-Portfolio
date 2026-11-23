"""Golden tests for stable AQI bands and guidance rules."""

import pytest
from starlette.types import Message, Receive, Scope, Send

from app.core.config import Settings
from app.core.middleware import SecurityHeadersMiddleware
from app.domain.safety import aqi_category, daily_guidance, safe_ventilation_guidance


@pytest.mark.parametrize(
    ("value", "label"),
    [
        (0, "Good"),
        (50, "Good"),
        (51, "Moderate"),
        (100, "Moderate"),
        (101, "Unhealthy for sensitive groups"),
        (150, "Unhealthy for sensitive groups"),
        (151, "Unhealthy"),
        (200, "Unhealthy"),
        (201, "Very unhealthy"),
        (300, "Very unhealthy"),
        (301, "Hazardous"),
        (500, "Hazardous"),
    ],
)
def test_aqi_category_boundaries(value: int, label: str) -> None:
    """Every EPA band edge maps to the expected descriptor."""
    result = aqi_category(value)
    assert result is not None
    assert result[0] == label


@pytest.mark.parametrize("value", [None, -1, 501, float("nan"), float("inf")])
def test_invalid_aqi_has_no_category(value: float | None) -> None:
    """Missing and out-of-range data remain unavailable."""
    assert aqi_category(value) is None


def test_guidance_handles_missing_values_without_inventing_readings() -> None:
    """Missing readings direct the user to a local source."""
    assert "unavailable" in daily_guidance(None, False)[0].lower()


def test_guidance_changes_for_sensitive_group_preference() -> None:
    """Sensitive-group preference adds a local-guidance reminder."""
    guidance = daily_guidance(120, True)
    assert any("sensitive groups" in item for item in guidance)
    assert any("lower-AQI" in item for item in guidance)


def test_good_aqi_guidance_keeps_usual_routine() -> None:
    """Good AQI suggests the usual routine and a later check."""
    assert len(daily_guidance(30, False)) == 2


def test_moderate_aqi_guidance_suggests_a_lower_forecast_window() -> None:
    """Moderate AQI guidance stays flexible and references forecast choice."""
    guidance = daily_guidance(75, False)
    assert len(guidance) == 1
    assert "lower forecast AQI" in guidance[0]


def test_ventilation_guidance_preserves_unavailable_status() -> None:
    """Ventilation guidance never substitutes a missing AQI value."""
    assert "unavailable" in safe_ventilation_guidance(None).lower()


def test_ventilation_guidance_for_elevated_aqi() -> None:
    """Elevated conditions produce cautious, non-medical wording."""
    assert "limit unfiltered outdoor air" in safe_ventilation_guidance(140)


def test_ventilation_guidance_for_lower_aqi() -> None:
    """Lower outdoor AQI does not trigger elevated-air guidance."""
    assert "Ventilate when useful" in safe_ventilation_guidance(40)


@pytest.mark.asyncio
async def test_request_body_limit_rejects_oversized_streamed_body() -> None:
    """The body cap rejects chunked payloads and applies security headers."""
    messages: list[Message] = [
        {"type": "http.request", "body": b"a" * 700, "more_body": True},
        {"type": "http.request", "body": b"b" * 400, "more_body": False},
    ]
    responses: list[Message] = []
    downstream_called = False

    async def receive() -> Message:
        return messages.pop(0) if messages else {"type": "http.disconnect"}

    async def send(message: Message) -> None:
        responses.append(message)

    async def downstream(scope: Scope, receive: Receive, send: Send) -> None:
        nonlocal downstream_called
        downstream_called = True

    middleware = SecurityHeadersMiddleware(
        downstream,
        Settings(_env_file=None, max_request_bytes=1024),
    )
    await middleware({"type": "http", "headers": []}, receive, send)

    start = next(message for message in responses if message["type"] == "http.response.start")
    headers = dict(start["headers"])
    assert start["status"] == 413
    assert headers[b"x-content-type-options"] == b"nosniff"
    assert b"x-request-id" in headers
    assert not downstream_called


@pytest.mark.asyncio
async def test_request_body_limit_replays_valid_streamed_body() -> None:
    """Accepted chunks are replayed as the same request body to the route."""
    messages: list[Message] = [
        {"type": "http.request", "body": b"first ", "more_body": True},
        {"type": "http.request", "body": b"second", "more_body": False},
    ]
    responses: list[Message] = []
    received_body = b""
    received_disconnect = False

    async def receive() -> Message:
        return messages.pop(0) if messages else {"type": "http.disconnect"}

    async def send(message: Message) -> None:
        responses.append(message)

    async def downstream(scope: Scope, receive: Receive, send: Send) -> None:
        nonlocal received_body, received_disconnect
        request = await receive()
        received_body = request.get("body", b"")
        received_disconnect = (await receive())["type"] == "http.disconnect"
        await send({"type": "http.response.start", "status": 204, "headers": []})
        await send({"type": "http.response.body", "body": b""})

    middleware = SecurityHeadersMiddleware(
        downstream,
        Settings(_env_file=None, max_request_bytes=1024),
    )
    await middleware({"type": "http", "headers": []}, receive, send)

    start = next(message for message in responses if message["type"] == "http.response.start")
    assert start["status"] == 204
    assert received_body == b"first second"
    assert received_disconnect


@pytest.mark.asyncio
async def test_request_body_limit_preserves_client_disconnect() -> None:
    """An early client disconnect remains visible to the downstream app."""
    received: list[Message] = []

    async def receive() -> Message:
        return {"type": "http.disconnect"}

    async def send(message: Message) -> None:
        pass

    async def downstream(scope: Scope, receive: Receive, send: Send) -> None:
        received.append(await receive())

    middleware = SecurityHeadersMiddleware(
        downstream,
        Settings(_env_file=None, max_request_bytes=1024),
    )
    await middleware({"type": "http", "headers": []}, receive, send)

    assert received == [{"type": "http.disconnect"}]
