from datetime import datetime, timezone

import pytest
from app.exceptions import TelegramCheckUnavailable
from app.models import (
    EligibilityStatus,
    Giveaway,
    GiveawayRequirement,
    Participation,
    RequirementType,
    User,
)
from app.services.eligibility import EligibilityService


class Checker:
    def __init__(self, result=True, failure=False):
        self.result = result
        self.failure = failure

    async def is_subscribed(self, chat_id, telegram_id):
        if self.failure:
            raise TelegramCheckUnavailable("api down")
        return self.result


def build():
    user = User(telegram_id=7, first_name="Test")
    giveaway = Giveaway(
        title="g",
        description="",
        starts_at=datetime.now(timezone.utc),
        ends_at=datetime.now(timezone.utc),
        winners_count=1,
        owner_id=user.id,
    )
    giveaway.requirements = [
        GiveawayRequirement(
            type=RequirementType.required_channel_subscription, config={"chat_id": -100}
        )
    ]
    participation = Participation()
    return giveaway, user, participation


@pytest.mark.asyncio
async def test_subscribed_is_eligible():
    giveaway, user, participation = build()
    await EligibilityService(Checker(True)).apply(giveaway, user, participation)
    assert participation.eligibility_status == EligibilityStatus.eligible


@pytest.mark.asyncio
async def test_not_subscribed_is_rejected():
    giveaway, user, participation = build()
    await EligibilityService(Checker(False)).apply(giveaway, user, participation)
    assert participation.eligibility_status == EligibilityStatus.rejected


@pytest.mark.asyncio
async def test_telegram_failure_stays_pending():
    giveaway, user, participation = build()
    await EligibilityService(Checker(failure=True)).apply(giveaway, user, participation)
    assert participation.eligibility_status == EligibilityStatus.pending
