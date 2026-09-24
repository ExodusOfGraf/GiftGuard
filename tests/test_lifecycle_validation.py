from datetime import datetime, timedelta, timezone

import pytest
from app.schemas import GiveawayCreate, RequirementCreate
from pydantic import ValidationError


def test_schedule_must_be_ordered():
    now = datetime.now(timezone.utc)
    with pytest.raises(ValidationError):
        GiveawayCreate(title="x", starts_at=now, ends_at=now, winners_count=1)


def test_winners_count_is_bounded():
    now = datetime.now(timezone.utc)
    with pytest.raises(ValidationError):
        GiveawayCreate(
            title="x", starts_at=now, ends_at=now + timedelta(hours=1), winners_count=101
        )


def test_schedule_requires_timezone():
    now = datetime.now().replace(tzinfo=None)
    with pytest.raises(ValidationError):
        GiveawayCreate(title="x", starts_at=now, ends_at=now + timedelta(hours=1), winners_count=1)


def test_channel_username_is_validated():
    with pytest.raises(ValidationError):
        RequirementCreate(config={"username": 'channel"><script>'})
