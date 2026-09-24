from __future__ import annotations

from typing import Any

from aiogram import Bot
from aiogram.exceptions import (
    TelegramAPIError,
    TelegramBadRequest,
    TelegramForbiddenError,
)

from app.exceptions import TelegramCheckUnavailable


class TelegramMembershipChecker:
    def __init__(self, bot: Bot | None) -> None:
        self.bot = bot

    async def is_subscribed(self, chat_id: int | str, telegram_id: int) -> bool:
        if self.bot is None:
            raise TelegramCheckUnavailable("Telegram bot is not configured")
        try:
            member = await self.bot.get_chat_member(chat_id=chat_id, user_id=telegram_id)
        except (TelegramBadRequest, TelegramForbiddenError, TelegramAPIError) as exc:
            raise TelegramCheckUnavailable("Telegram membership check unavailable") from exc
        return member.status in {"creator", "administrator", "member"} or (
            member.status == "restricted" and bool(getattr(member, "is_member", False))
        )


class PrizeVerificationProvider:
    async def verify(
        self, prize_type: str, metadata: dict[str, Any]
    ) -> tuple[bool, dict[str, Any]]:
        # Ownership and provenance require a chain or Telegram specific integration.
        return False, {"reason": "automatic verification is unavailable for this prize type"}
