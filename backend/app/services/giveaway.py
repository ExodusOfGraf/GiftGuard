from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.draw.protocol import commitment, encrypt_secret_seed, generate_secret_seed
from app.exceptions import AuthorizationError, InvalidTransition, NotFoundError
from app.models import Giveaway, GiveawayStatus, User
from app.repositories import GiveawayRepository, add_requirement, upsert_prize
from app.schemas import GiveawayCreate, GiveawayUpdate, PrizeCreate, RequirementCreate


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class GiveawayService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.repo = GiveawayRepository(session)

    async def create(self, owner: User, data: GiveawayCreate) -> Giveaway:
        giveaway = Giveaway(owner_id=owner.id, **data.model_dump())
        self.session.add(giveaway)
        await self.session.flush()
        return giveaway

    async def get_owned(self, owner: User, giveaway_id: uuid.UUID, lock: bool = False) -> Giveaway:
        giveaway = await self.repo.get(giveaway_id, for_update=lock)
        if not giveaway:
            raise NotFoundError("giveaway not found")
        if giveaway.owner_id != owner.id:
            raise AuthorizationError("giveaway belongs to another organizer")
        return giveaway

    async def update(self, owner: User, giveaway_id: uuid.UUID, data: GiveawayUpdate) -> Giveaway:
        giveaway = await self.get_owned(owner, giveaway_id, lock=True)
        if giveaway.status != GiveawayStatus.draft:
            raise InvalidTransition("only draft giveaways can be edited")
        values = data.model_dump(exclude_unset=True, exclude_none=True)
        for key, value in values.items():
            setattr(giveaway, key, value)
        if giveaway.starts_at.tzinfo is None or giveaway.ends_at.tzinfo is None:
            raise ValueError("schedule timestamps must include a timezone")
        if giveaway.ends_at <= giveaway.starts_at:
            raise ValueError("ends_at must be after starts_at")
        await self.session.flush()
        return giveaway

    async def publish(self, owner: User, giveaway_id: uuid.UUID) -> Giveaway:
        giveaway = await self.get_owned(owner, giveaway_id, lock=True)
        if giveaway.status != GiveawayStatus.draft:
            raise InvalidTransition("only draft giveaways can be published")
        if not giveaway.prize:
            raise InvalidTransition("a prize is required before publishing")
        now = utc_now()
        if giveaway.ends_at <= now:
            raise InvalidTransition("cannot publish a giveaway after its deadline")
        seed = generate_secret_seed()
        from app.models import Draw

        giveaway.status = (
            GiveawayStatus.active if giveaway.starts_at <= now else GiveawayStatus.scheduled
        )
        giveaway.published_at = now
        self.session.add(
            Draw(
                giveaway_id=giveaway.id,
                commitment_hash=commitment(seed),
                encrypted_secret_seed=encrypt_secret_seed(seed, self.settings.app_secret),
            )
        )
        await self.session.flush()
        return giveaway

    async def cancel(self, owner: User, giveaway_id: uuid.UUID) -> Giveaway:
        giveaway = await self.get_owned(owner, giveaway_id, lock=True)
        if giveaway.status not in {
            GiveawayStatus.draft,
            GiveawayStatus.scheduled,
            GiveawayStatus.active,
        }:
            raise InvalidTransition("giveaway cannot be cancelled in this state")
        giveaway.status = GiveawayStatus.cancelled
        await self.session.flush()
        return giveaway

    async def add_requirement(
        self, owner: User, giveaway_id: uuid.UUID, data: RequirementCreate
    ) -> Any:
        giveaway = await self.get_owned(owner, giveaway_id)
        if giveaway.status != GiveawayStatus.draft:
            raise InvalidTransition("requirements are immutable after publication")
        return await add_requirement(self.session, giveaway, data.type.value, data.config)

    async def set_prize(self, owner: User, giveaway_id: uuid.UUID, data: PrizeCreate) -> Any:
        giveaway = await self.get_owned(owner, giveaway_id)
        if giveaway.status != GiveawayStatus.draft:
            raise InvalidTransition("prize is immutable after publication")
        return await upsert_prize(self.session, giveaway, **data.model_dump())
