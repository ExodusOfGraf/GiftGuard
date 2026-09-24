import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import pytest
from app.auth import validate_init_data
from app.config import Settings
from app.exceptions import AuthorizationError


def make_init_data(token: str, user: dict, auth_date: int | None = None) -> str:
    values = {
        "auth_date": str(auth_date or int(time.time())),
        "user": json.dumps(user, separators=(",", ":")),
    }
    check = "\n".join(f"{key}={values[key]}" for key in sorted(values))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    values["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(values)


def test_telegram_init_data_validation() -> None:
    settings = Settings(app_secret="x" * 32, bot_token="token")
    user = validate_init_data(make_init_data("token", {"id": 42, "first_name": "Ada"}), settings)
    assert user.telegram_id == 42


def test_telegram_init_data_rejects_tampering() -> None:
    settings = Settings(app_secret="x" * 32, bot_token="token")
    with pytest.raises(AuthorizationError):
        validate_init_data(make_init_data("token", {"id": 42}) + "x", settings)
