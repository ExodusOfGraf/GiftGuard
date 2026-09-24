from __future__ import annotations

from aiogram import Bot
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.aiohttp import AiohttpSession


def create_bot(
    token: str,
    *,
    proxy_url: str | None = None,
    default: DefaultBotProperties | None = None,
) -> Bot:
    session = AiohttpSession(proxy=proxy_url) if proxy_url else None
    return Bot(token, session=session, default=default)
