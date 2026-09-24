from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Giveaway, GiveawayRequirement, Participation, Prize, User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_or_create(self, telegram_id: int, **profile: Any) -> User:
        user = await self.session.scalar(select(User).where(User.telegram_id == telegram_id))
        if user:
            for key, value in profile.items():
                if value is not None:
                    setattr(user, key, value)
            return user
        user = User(telegram_id=telegram_id, **profile)
        self.session.add(user)
        await self.session.flush()
        return user


class GiveawayRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, giveaway_id: uuid.UUID, for_update: bool = False) -> Giveaway | None:
        statement = (
            select(Giveaway)
            .options(
                selectinload(Giveaway.requirements),
                selectinload(Giveaway.prize),
                selectinload(Giveaway.draw),
            )
            .where(Giveaway.id == giveaway_id)
        )
        if for_update:
            statement = statement.with_for_update()
        return await self.session.scalar(statement)

    async def list_for_owner(self, owner_id: uuid.UUID) -> list[Giveaway]:
        result = await self.session.scalars(
            select(Giveaway)
            .options(
                selectinload(Giveaway.requirements),
                selectinload(Giveaway.prize),
            )
            .where(Giveaway.owner_id == owner_id)
            .order_by(Giveaway.created_at.desc())
        )
        return list(result.all())


class ParticipationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_for_user(
        self, giveaway_id: uuid.UUID, user_id: uuid.UUID
    ) -> Participation | None:
        return await self.session.scalar(
            select(Participation).where(
                Participation.giveaway_id == giveaway_id, Participation.user_id == user_id
            )
        )

    async def count_since(self, giveaway_id: uuid.UUID, joined_after: datetime) -> int:
        return int(
            await self.session.scalar(
                select(func.count(Participation.id)).where(
                    Participation.giveaway_id == giveaway_id,
                    Participation.joined_at >= joined_after,
                )
            )
            or 0
        )

    async def list_page(
        self,
        giveaway_id: uuid.UUID,
        offset: int,
        limit: int,
        eligibility: str | None,
        risk: str | None,
    ) -> list[Participation]:
        statement = select(Participation).where(Participation.giveaway_id == giveaway_id)
        if eligibility:
            statement = statement.where(Participation.eligibility_status == eligibility)
        if risk:
            statement = statement.where(Participation.risk_level == risk)
        result = await self.session.scalars(
            statement.order_by(Participation.joined_at.asc()).offset(offset).limit(limit)
        )
        return list(result.all())


async def add_requirement(
    session: AsyncSession, giveaway: Giveaway, type_: str, config: dict[str, Any]
) -> GiveawayRequirement:
    requirement = GiveawayRequirement(giveaway_id=giveaway.id, type=type_, config=config)
    session.add(requirement)
    await session.flush()
    return requirement


async def upsert_prize(session: AsyncSession, giveaway: Giveaway, **values: Any) -> Prize:
    if "metadata" in values:
        values["metadata_json"] = values.pop("metadata")
    prize = giveaway.prize
    if prize is None:
        prize = Prize(giveaway_id=giveaway.id, **values)
        session.add(prize)
    else:
        for key, value in values.items():
            setattr(prize, key, value)
    await session.flush()
    return prize
