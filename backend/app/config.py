from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    app_secret: str = Field(min_length=16)
    bot_token: str = ""
    database_url: str = "postgresql+asyncpg://giftguard:giftguard@postgres:5432/giftguard"
    redis_url: str = "redis://redis:6379/0"
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"
    telegram_auth_max_age_seconds: int = 86400
    rate_limit_per_minute: int = 5
    entropy_provider: str = "timestamp-dev"

    @model_validator(mode="after")
    def reject_unimplemented_entropy(self) -> "Settings":
        if self.entropy_provider != "timestamp-dev":
            raise ValueError("only timestamp-dev entropy is implemented")
        if self.is_production:
            raise ValueError("timestamp-dev entropy is not safe for production")
        return self

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
