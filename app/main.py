"""FastAPI application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware

from app.api.routers import air_quality, health, places, planner
from app.clients.open_meteo import OpenMeteoClient
from app.clients.photon import PhotonClient
from app.core.config import get_settings
from app.core.middleware import SecurityHeadersMiddleware
from app.core.rate_limit import limiter
from app.services.air_quality import AirQualityService
from app.services.planner import GeminiPlanner


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    """Create one shared HTTP client for the app lifetime."""
    timeout = httpx.Timeout(8.0, connect=2.0)
    limits = httpx.Limits(max_connections=20, max_keepalive_connections=10)
    async with httpx.AsyncClient(timeout=timeout, limits=limits) as client:
        settings = get_settings()
        upstream = OpenMeteoClient(client)
        application.state.http_client = client
        application.state.open_meteo = upstream
        application.state.photon = PhotonClient(client)
        application.state.air_quality = AirQualityService(upstream, settings.cache_ttl_seconds)
        application.state.planner = GeminiPlanner(
            client, settings.gemini_api_key, settings.gemini_model
        )
        yield


def create_app() -> FastAPI:
    """Build the configured ASGI application."""
    settings = get_settings()
    app = FastAPI(
        title="AirWise AI",
        version="0.1.0",
        description="Urban air quality and routine planning based on sourced model data.",
        docs_url=None if settings.env == "production" else "/docs",
        redoc_url=None,
        lifespan=lifespan,
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_middleware(SecurityHeadersMiddleware, settings=settings)
    app.add_middleware(GZipMiddleware, minimum_size=500)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Accept", "Content-Type"],
    )
    app.add_middleware(SlowAPIMiddleware)
    app.include_router(health.router)
    app.include_router(places.router)
    app.include_router(air_quality.router)
    app.include_router(planner.router)
    return app


async def validation_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return a compact validation response without reflecting submitted values."""
    _ = request
    if not isinstance(exc, RequestValidationError):
        return JSONResponse(status_code=400, content={"detail": "The request is invalid."})
    return JSONResponse(
        status_code=422, content={"detail": "The request did not match the expected format."}
    )


async def rate_limit_error_handler(request: Request, exc: Exception) -> Response:
    """Use the SlowAPI response without exposing the throttled request contents."""
    if isinstance(exc, RateLimitExceeded):
        return _rate_limit_exceeded_handler(request, exc)
    return JSONResponse(status_code=429, content={"detail": "Too many requests."})


app = create_app()
