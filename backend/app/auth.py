from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl

from app.config import Settings
from app.exceptions import AuthorizationError


@dataclass(frozen=True)
class TelegramWebAppUser:
    telegram_id: int
    username: str | None
    first_name: str
    last_name: str | None


def validate_init_data(
    raw_init_data: str, settings: Settings, now: int | None = None
) -> TelegramWebAppUser:
    if not raw_init_data or len(raw_init_data) > 8192:
        raise AuthorizationError("invalid Telegram initData")
    try:
        pairs = parse_qsl(raw_init_data, keep_blank_values=True, strict_parsing=True)
    except ValueError as exc:
        raise AuthorizationError("malformed Telegram initData") from exc
    values: dict[str, str] = {}
    for key, value in pairs:
        if key in values or key in {"hash", "signature"}:
            if key in values:
                raise AuthorizationError("duplicate initData field")
        values[key] = value
    received_hash = values.pop("hash", None)
    values.pop("signature", None)
    if not received_hash or len(received_hash) != 64:
        raise AuthorizationError("missing initData hash")
    if not settings.bot_token:
        raise AuthorizationError("Telegram bot is not configured")
    data_check_string = "\n".join(f"{key}={values[key]}" for key in sorted(values))
    secret_key = hmac.new(b"WebAppData", settings.bot_token.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_hash, received_hash):
        raise AuthorizationError("invalid Telegram initData signature")
    try:
        auth_date = int(values["auth_date"])
        user_data = json.loads(values["user"])
        telegram_id = int(user_data["id"])
    except (KeyError, ValueError, TypeError, json.JSONDecodeError) as exc:
        raise AuthorizationError("invalid Telegram user data") from exc
    current = int(time.time()) if now is None else now
    if auth_date > current + 60 or current - auth_date > settings.telegram_auth_max_age_seconds:
        raise AuthorizationError("expired Telegram initData")
    return TelegramWebAppUser(
        telegram_id=telegram_id,
        username=user_data.get("username"),
        first_name=str(user_data.get("first_name", "")),
        last_name=user_data.get("last_name"),
    )
