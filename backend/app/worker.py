from __future__ import annotations

from datetime import datetime, timezone

from aiogram import Bot
from arq import cron
from arq.connections import RedisSettings
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.db import SessionLocal
from app.integrations.telegram import TelegramMembershipChecker
from app.models import EligibilityStatus, Giveaway, GiveawayStatus, Participation
from app.repositories import GiveawayRepository
from app.services.draw import DrawService
from app.services.eligibility import EligibilityService


async def activate_scheduled(ctx) -> None:
    async with SessionLocal() as session:
        ids = list(
            (
                await session.scalars(
                    select(Giveaway.id)
                    .where(
                        Giveaway.status == GiveawayStatus.scheduled,
                        Giveaway.starts_at <= datetime.now(timezone.utc),
                        Giveaway.ends_at > datetime.now(timezone.utc),
                    )
                    .limit(100)
                )
            ).all()
        )
        for giveaway_id in ids:
            giveaway = await GiveawayRepository(session).get(giveaway_id, for_update=True)
            if giveaway and giveaway.status == GiveawayStatus.scheduled:
                giveaway.status = GiveawayStatus.active
        await session.commit()


async def recheck_participations(ctx) -> None:
    settings = get_settings()
    if not settings.bot_token:
        return
    bot = Bot(settings.bot_token)
    try:
        async with SessionLocal() as session:
            ids = list(
                (
                    await session.scalars(
                        select(Participation.id)
                        .join(Giveaway)
                        .where(
                            Giveaway.status.in_([GiveawayStatus.active, GiveawayStatus.scheduled]),
                            Giveaway.ends_at > datetime.now(timezone.utc),
                            Participation.eligibility_status.in_(
                                [EligibilityStatus.pending, EligibilityStatus.rejected]
                            ),
                        )
                        .order_by(Participation.eligibility_checked_at.asc().nullsfirst())
                        .limit(100)
                    )
                ).all()
            )
            for participation_id in ids:
                participation = await session.scalar(
                    select(Participation)
                    .options(selectinload(Participation.user))
                    .where(Participation.id == participation_id)
                )
                if not participation:
                    continue
                giveaway = await GiveawayRepository(session).get(
                    participation.giveaway_id, for_update=True
                )
                now = datetime.now(timezone.utc)
                if (
                    not giveaway
                    or giveaway.status not in {GiveawayStatus.active, GiveawayStatus.scheduled}
                    or not (giveaway.starts_at <= now < giveaway.ends_at)
                ):
                    continue
                await EligibilityService(TelegramMembershipChecker(bot)).apply(
                    giveaway, participation.user, participation
                )
                await session.commit()
    finally:
        await bot.session.close()


async def close_expired(ctx) -> None:
    async with SessionLocal() as session:
        ids = list(
            (
                await session.scalars(
                    select(Giveaway.id)
                    .where(
                        Giveaway.status.in_([GiveawayStatus.scheduled, GiveawayStatus.active]),
                        Giveaway.ends_at <= datetime.now(timezone.utc),
                    )
                    .limit(100)
                )
            ).all()
        )
        for giveaway_id in ids:
            await DrawService(session, get_settings()).execute(giveaway_id)
            await session.commit()


class WorkerSettings:
    functions = [activate_scheduled, recheck_participations, close_expired]
    cron_jobs = [
        cron(activate_scheduled, second=0),
        cron(recheck_participations, second=0),
        cron(close_expired, second=0),
    ]
    redis_settings = RedisSettings.from_dsn(get_settings().redis_url)
