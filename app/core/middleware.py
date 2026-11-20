"""Request safety and security response middleware."""

from uuid import uuid4

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

from app.core.config import Settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach baseline browser security headers and enforce a body size cap."""

    def __init__(self, app: ASGIApp, settings: Settings) -> None:
        super().__init__(app)
        self.settings = settings

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Apply request limits and response headers."""
        request_id = uuid4().hex
        length = request.headers.get("content-length")
        if length:
            try:
                request_size = int(length)
            except ValueError:
                return JSONResponse(status_code=400, content={"detail": "Invalid request length."})
            if request_size > self.settings.max_request_bytes:
                return JSONResponse(status_code=413, content={"detail": "Request is too large."})
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        return response
