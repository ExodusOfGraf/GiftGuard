from __future__ import annotations

import asyncio
import sys

from app.config import get_settings
from app.integrations.telegram_bot import create_bot


async def check_telegram_api() -> int:
    settings = get_settings()
    if not settings.bot_token:
        print("Telegram Bot API check failed: BOT_TOKEN missing", file=sys.stderr)
        return 1

    bot = create_bot(settings.bot_token, proxy_url=settings.telegram_proxy_url)
    try:
        await asyncio.wait_for(bot.get_me(), timeout=20)
    except Exception as exc:
        print(f"Telegram Bot API check failed: {type(exc).__name__}", file=sys.stderr)
        return 1
    finally:
        await bot.session.close()

    print("Telegram Bot API check passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(check_telegram_api()))
