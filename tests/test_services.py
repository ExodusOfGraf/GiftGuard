from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from app.config import Settings
from app.draw.protocol import commitment, encrypt_secret_seed
from app.exceptions import DrawError, InvalidTransition
from app.models import (
    Draw,
    EligibilityStatus,
    Giveaway,
    GiveawayStatus,
    Participation,
    Prize,
    PrizeType,
    User,
)
from app.schemas import GiveawayUpdate
from app.services.draw import DrawService
from app.services.giveaway import GiveawayService
from app.services.participation import ParticipationService


class FakeSession:
    def __init__(self, giveaway):
        self.giveaway = giveaway
        self.added = []

    def add(self, item):
        self.added.append(item)

    async def flush(self):
        pass

    async def scalar(self, statement):
        return self.giveaway


class FakeRepo:
    def __init__(self, giveaway):
        self.giveaway = giveaway

    async def get(self, giveaway_id, for_update=False):
        return self.giveaway


def build_giveaway(*, starts_offset=-1, ends_offset=1):
    now = datetime.now(timezone.utc)
    owner = User(id=uuid4(), telegram_id=1, first_name="Owner", first_interaction_at=now)
    giveaway = Giveaway(
        id=uuid4(),
        owner_id=owner.id,
        title="Campaign",
        starts_at=now + timedelta(hours=starts_offset),
        ends_at=now + timedelta(hours=ends_offset),
        winners_count=1,
        status=GiveawayStatus.draft,
    )
    giveaway.prize = Prize(id=uuid4(), type=PrizeType.custom, title="Prize")
    giveaway.requirements = []
    giveaway.participations = []
    return owner, giveaway


@pytest.mark.asyncio
async def test_publish_and_immutable_after_publish():
    owner, giveaway = build_giveaway()
    session = FakeSession(giveaway)
    service = GiveawayService(session, Settings(app_secret="x" * 32, bot_token="token"))
    service.repo = FakeRepo(giveaway)
    published = await service.publish(owner, giveaway.id)
    assert published.status == GiveawayStatus.active
    assert any(isinstance(item, Draw) for item in session.added)
    with pytest.raises(InvalidTransition):
        await service.update(owner, giveaway.id, GiveawayUpdate(title="Changed"))
    with pytest.raises(InvalidTransition):
        await service.publish(owner, giveaway.id)


@pytest.mark.asyncio
async def test_expired_draft_cannot_be_published():
    owner, giveaway = build_giveaway(starts_offset=-2, ends_offset=-1)
    session = FakeSession(giveaway)
    service = GiveawayService(session, Settings(app_secret="x" * 32, bot_token="token"))
    service.repo = FakeRepo(giveaway)
    with pytest.raises(InvalidTransition):
        await service.publish(owner, giveaway.id)


@pytest.mark.asyncio
async def test_draw_completes_once_after_deadline():
    owner, giveaway = build_giveaway(starts_offset=-2, ends_offset=-1)
    giveaway.status = GiveawayStatus.active
    seed = "a" * 64
    settings = Settings(app_secret="x" * 32, bot_token="token")
    giveaway.draw = Draw(
        id=uuid4(),
        giveaway_id=giveaway.id,
        algorithm_version="giftguard-v1",
        commitment_hash=commitment(seed),
        encrypted_secret_seed=encrypt_secret_seed(seed, settings.app_secret),
    )
    now = datetime.now(timezone.utc)
    entrant = User(id=uuid4(), telegram_id=2, first_name="Entrant", first_interaction_at=now)
    ticket = Participation(
        id=uuid4(),
        giveaway_id=giveaway.id,
        user_id=entrant.id,
        joined_at=now - timedelta(hours=1),
        eligibility_status=EligibilityStatus.eligible,
        metadata_json={},
    )
    ticket.user = entrant
    giveaway.participations = [ticket]
    session = FakeSession(giveaway)
    draw = await DrawService(session, settings).execute(giveaway.id)
    assert giveaway.status == GiveawayStatus.completed
    assert len(draw.participant_snapshot) == 1
    assert len([item for item in session.added if item.__class__.__name__ == "Winner"]) == 1
    with pytest.raises(DrawError):
        await DrawService(session, settings).execute(giveaway.id)


@pytest.mark.asyncio
async def test_draw_before_deadline_is_forbidden():
    owner, giveaway = build_giveaway()
    giveaway.status = GiveawayStatus.active
    with pytest.raises(InvalidTransition):
        await DrawService(FakeSession(giveaway), Settings(app_secret="x" * 32)).execute(giveaway.id)


@pytest.mark.asyncio
async def test_duplicate_participation_is_idempotent(monkeypatch):
    owner, giveaway = build_giveaway()
    giveaway.status = GiveawayStatus.active
    now = datetime.now(timezone.utc)
    user = User(id=uuid4(), telegram_id=3, first_name="User", first_interaction_at=now)
    ticket = Participation(
        id=uuid4(),
        giveaway_id=giveaway.id,
        user_id=user.id,
        joined_at=now,
        eligibility_status=EligibilityStatus.eligible,
        metadata_json={},
    )

    class ExistingRepo:
        def __init__(self, session):
            pass

        async def get_for_user(self, giveaway_id, user_id):
            return ticket

    class GiveawayRepo:
        def __init__(self, session):
            pass

        async def get(self, giveaway_id, for_update=False):
            return giveaway

    import app.services.participation as module

    monkeypatch.setattr(module, "ParticipationRepository", ExistingRepo)
    monkeypatch.setattr(module, "GiveawayRepository", GiveawayRepo)
    service = ParticipationService(FakeSession(giveaway), checker=None)
    assert await service.participate(giveaway.id, user) is ticket
    assert await service.participate(giveaway.id, user) is ticket
    giveaway.ends_at = now - timedelta(seconds=1)
    with pytest.raises(InvalidTransition):
        await service.participate(giveaway.id, user)
