"""Request safety and security response middleware."""

from uuid import uuid4

from starlette.datastructures import Headers, MutableHeaders
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import Settings


class SecurityHeadersMiddleware:
    """Enforce a streaming request-size cap and attach browser security headers."""

    def __init__(self, app: ASGIApp, settings: Settings) -> None:
        self.app = app
        self.max_request_bytes = settings.max_request_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Reject oversized bodies before routing and decorate every HTTP response."""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = uuid4().hex

        async def send_with_security_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["X-Request-ID"] = request_id
                headers["X-Content-Type-Options"] = "nosniff"
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
                headers["X-Frame-Options"] = "DENY"
                headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
                headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
            await send(message)

        async def reject(status_code: int, detail: str) -> None:
            response = JSONResponse(status_code=status_code, content={"detail": detail})
            await response(scope, receive, send_with_security_headers)

        length = Headers(scope=scope).get("content-length")
        if length is not None:
            try:
                declared_size = int(length)
            except ValueError:
                await reject(400, "Invalid request length.")
                return
            if declared_size < 0:
                await reject(400, "Invalid request length.")
                return
            if declared_size > self.max_request_bytes:
                await reject(413, "Request is too large.")
                return

        request_body = bytearray()
        request_complete = False
        pending_message: Message | None = None
        while not request_complete:
            message = await receive()
            if message["type"] == "http.disconnect":
                pending_message = message
                break
            chunk = message.get("body", b"")
            if len(request_body) + len(chunk) > self.max_request_bytes:
                await reject(413, "Request is too large.")
                return
            request_body.extend(chunk)
            request_complete = not message.get("more_body", False)

        request_message: Message | None = None
        if request_body or request_complete:
            request_message = {
                "type": "http.request",
                "body": bytes(request_body),
                "more_body": not request_complete,
            }

        async def replay_receive() -> Message:
            nonlocal request_message, pending_message
            if request_message is not None:
                message = request_message
                request_message = None
                return message
            if pending_message is not None:
                message = pending_message
                pending_message = None
                return message
            return await receive()

        await self.app(scope, replay_receive, send_with_security_headers)
