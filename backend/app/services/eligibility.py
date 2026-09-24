from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.exceptions import TelegramCheckUnavailable
from app.integrations.telegram import TelegramMembershipChecker
from app.models import EligibilityStatus, Giveaway, Participation, RequirementType, User


class EligibilityService:
    def __init__(self, checker: TelegramMembershipChecker) -> None:
        self.checker = checker

    async def check(
        self, giveaway: Giveaway, user: User, participation: Participation | None = None
    ) -> tuple[EligibilityStatus, str | None, dict[str, Any]]:
        observations: dict[str, Any] = {"checks": []}
        for requirement in giveaway.requirements:
            if requirement.type != RequirementType.required_channel_subscription:
                continue
            chat_id = requirement.config.get("chat_id") or requirement.config.get("username")
            try:
                subscribed = await self.checker.is_subscribed(chat_id, user.telegram_id)
            except TelegramCheckUnavailable as exc:
                observations["checks"].append(
                    {"requirement_id": str(requirement.id), "status": "unavailable"}
                )
                return EligibilityStatus.pending, str(exc), observations
            observations["checks"].append(
                {"requirement_id": str(requirement.id), "subscribed": subscribed}
            )
            if not subscribed:
                return (
                    EligibilityStatus.rejected,
                    "required channel subscription is missing",
                    observations,
                )
        return EligibilityStatus.eligible, None, observations

    async def apply(self, giveaway: Giveaway, user: User, participation: Participation) -> None:
        status, reason, observations = await self.check(giveaway, user, participation)
        previous = participation.eligibility_status
        metadata = participation.metadata_json or {}
        if status != EligibilityStatus.eligible and "requirements_first_unmet_at" not in metadata:
            metadata["requirements_first_unmet_at"] = datetime.now(timezone.utc).isoformat()
        if status == EligibilityStatus.eligible and previous != EligibilityStatus.eligible:
            if "requirements_first_unmet_at" in metadata:
                metadata["requirements_completed_at"] = datetime.now(timezone.utc).isoformat()
        participation.eligibility_status = status
        participation.rejection_reason = reason
        participation.eligibility_checked_at = datetime.now(timezone.utc)
        participation.metadata_json = {**metadata, "eligibility": observations}
