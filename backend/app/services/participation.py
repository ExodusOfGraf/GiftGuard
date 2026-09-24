from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.antifraud.engine import RiskEngine
from app.antifraud.rules import RiskContext
from app.exceptions import InvalidTransition, NotFoundError
from app.integrations.telegram import TelegramMembershipChecker
from app.models import GiveawayStatus, Participation, User
from app.repositories import GiveawayRepository, ParticipationRepository
from app.services.eligibility import EligibilityService


class ParticipationService:
    def __init__(
        self,
        session: AsyncSession,
        checker: TelegramMembershipChecker,
        risk_engine: RiskEngine | None = None,
    ) -> None:
        self.session = session
        self.checker = checker
        self.risk_engine = risk_engine or RiskEngine()

    async def participate(
        self, giveaway_id: uuid.UUID, user: User, metadata: dict | None = None
    ) -> Participation:
        giveaway = await GiveawayRepository(self.session).get(giveaway_id, for_update=True)
        if not giveaway:
            raise NotFoundError("giveaway not found")
        now = datetime.now(timezone.utc)
        if giveaway.status not in {GiveawayStatus.active, GiveawayStatus.scheduled} or not (
            giveaway.starts_at <= now < giveaway.ends_at
        ):
            raise InvalidTransition("giveaway is not accepting entries")
        repo = ParticipationRepository(self.session)
        existing = await repo.get_for_user(giveaway_id, user.id)
        if existing:
            return existing
        participation = Participation(
            giveaway_id=giveaway_id, user_id=user.id, metadata_json=metadata or {}
        )
        self.session.add(participation)
        await self.session.flush()
        risk_context = RiskContext(
            joined_at=participation.joined_at or now,
            giveaway_published_at=giveaway.published_at,
            requirement_completed_at=None,
            participant_count_in_window=await repo.count_since(
                giveaway_id, now - timedelta(seconds=90)
            ),
            requirements_count=len(giveaway.requirements),
            first_interaction=(user.first_interaction_at >= now - timedelta(minutes=2)),
        )
        assessment = await self.risk_engine.assess(risk_context)
        participation.risk_score = assessment.score
        participation.risk_level = assessment.level
        participation.metadata_json = {
            **(participation.metadata_json or {}),
            "risk_signals": [signal.__dict__ for signal in assessment.signals],
        }
        await EligibilityService(self.checker).apply(giveaway, user, participation)
        return participation
