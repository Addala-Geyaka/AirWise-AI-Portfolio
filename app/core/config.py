"""Environment-backed application settings."""

from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Validated settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_prefix="APP_", env_file=".env", extra="ignore")

    env: str = "development"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    cache_ttl_seconds: int = Field(default=600, ge=30, le=3600)
    max_request_bytes: int = Field(default=16384, ge=1024, le=1048576)
    gemini_api_key: SecretStr | None = None
    gemini_model: str = Field(default="gemini-2.5-flash", pattern=r"^gemini-[a-z0-9.-]{1,80}$")

    @property
    def allowed_origins(self) -> list[str]:
        """Parse configured CORS origins, excluding wildcard entries."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip() != "*"]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached application settings."""
    return Settings()
