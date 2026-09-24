from __future__ import annotations

import uuid
from bisect import bisect_left, bisect_right
from collections import Counter
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.antifraud.engine import RiskEngine
from app.antifraud.rules import RiskContext
from app.config import Settings
from app.draw.protocol import (
    TimestampEntropyProvider,
    decrypt_secret_seed,
    make_draw_result,
)
from app.exceptions import DrawError, InvalidTransition, NotFoundError
from app.models import Draw, Giveaway, GiveawayStatus, Participation, Winner


class DrawService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings

    async def execute(self, giveaway_id: uuid.UUID) -> Draw:
        giveaway = await self.session.scalar(
            select(Giveaway)
            .options(
                selectinload(Giveaway.participations).selectinload(Participation.user),
                selectinload(Giveaway.requirements),
                selectinload(Giveaway.draw),
            )
            .where(Giveaway.id == giveaway_id)
            .execution_options(populate_existing=True)
            .with_for_update()
        )
        if not giveaway:
            raise NotFoundError("giveaway not found")
        now = datetime.now(timezone.utc)
        if now < giveaway.ends_at:
            raise InvalidTransition("draw is available only after ends_at")
        if giveaway.status in {GiveawayStatus.completed, GiveawayStatus.cancelled}:
            if giveaway.status == GiveawayStatus.completed:
                raise DrawError("draw has already been executed")
            raise InvalidTransition("cancelled giveaway cannot be drawn")
        draw = giveaway.draw
        if draw is None:
            raise DrawError("published giveaway has no draw commitment")
        if draw.executed_at is not None:
            raise DrawError("draw has already been executed")
        giveaway.status = GiveawayStatus.locked
        await self._recalculate_risk(giveaway)
        eligible = [
            item for item in giveaway.participations if item.eligibility_status == "eligible"
        ]
        if giveaway.exclude_high_risk:
            eligible = [item for item in eligible if item.risk_level != "high"]
        tickets = [str(item.id) for item in eligible]
        secret_seed = decrypt_secret_seed(draw.encrypted_secret_seed, self.settings.app_secret)
        giveaway.status = GiveawayStatus.drawing
        provider = TimestampEntropyProvider()
        entropy = await provider.get_entropy(giveaway.ends_at)
        result = make_draw_result(tickets, giveaway.winners_count, secret_seed, entropy)
        draw.participant_snapshot = result.participant_snapshot
        draw.participant_snapshot_hash = result.participant_snapshot_hash
        draw.external_entropy = result.external_entropy
        draw.entropy_provider = provider.name
        draw.final_seed = result.final_seed
        draw.executed_at = now
        giveaway.status = GiveawayStatus.completed
        if result.winners:
            by_ticket = {str(item.id): item for item in eligible}
            for position, ticket in enumerate(result.winners, start=1):
                self.session.add(
                    Winner(
                        draw_id=draw.id, participation_id=by_ticket[ticket].id, position=position
                    )
                )
        await self.session.flush()
        return draw

    async def _recalculate_risk(self, giveaway: Giveaway) -> None:
        participations = giveaway.participations
        joined_times = sorted(item.joined_at for item in participations)
        patterns = Counter(
            (
                (item.metadata_json or {}).get("user_agent", "")[:100],
                int(item.joined_at.timestamp()) // 10,
            )
            for item in participations
        )
        engine = RiskEngine()
        for item in participations:
            window_start = item.joined_at.timestamp() - 90
            count = bisect_right(joined_times, item.joined_at) - bisect_left(
                joined_times, datetime.fromtimestamp(window_start, timezone.utc)
            )
            metadata = item.metadata_json or {}
            completed_at = metadata.get("requirements_completed_at")
            try:
                completed_datetime = datetime.fromisoformat(completed_at) if completed_at else None
            except ValueError:
                completed_datetime = None
            pattern = (
                metadata.get("user_agent", "")[:100],
                int(item.joined_at.timestamp()) // 10,
            )
            assessment = await engine.assess(
                RiskContext(
                    joined_at=item.joined_at,
                    giveaway_published_at=giveaway.published_at,
                    requirement_completed_at=completed_datetime,
                    participant_count_in_window=count,
                    duplicate_pattern_count=patterns[pattern] if pattern[0] else 0,
                    first_interaction=0
                    <= (item.joined_at - item.user.first_interaction_at).total_seconds()
                    <= 120,
                    requirements_count=len(giveaway.requirements),
                )
            )
            item.risk_score = assessment.score
            item.risk_level = assessment.level
            item.metadata_json = {
                **metadata,
                "risk_signals": [signal.__dict__ for signal in assessment.signals],
            }


class DrawVerifier:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def verify(self, giveaway: Giveaway, draw: Draw, winners: list[Winner]) -> bool:
        from app.services.verification import _verify_completed

        ordered = sorted(winners, key=lambda item: item.position)
        return await _verify_completed(giveaway, draw, ordered, self.settings)
