from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Protocol


@dataclass(frozen=True)
class RiskSignal:
    rule: str
    score: int
    reason: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class RiskContext:
    joined_at: datetime
    giveaway_published_at: datetime | None
    requirement_completed_at: datetime | None
    participant_count_in_window: int = 0
    burst_window_seconds: int = 90
    duplicate_pattern_count: int = 0
    first_interaction: bool = False
    requirements_count: int = 0
    referral_anomaly: bool = False


class RiskRule(Protocol):
    async def evaluate(self, context: RiskContext) -> RiskSignal | None: ...


class ParticipationBurstRule:
    async def evaluate(self, context: RiskContext) -> RiskSignal | None:
        if context.participant_count_in_window < 20:
            return None
        score = min(25, 5 + context.participant_count_in_window // 25)
        return RiskSignal(
            "participation_burst",
            score,
            f"User joined during a burst of {context.participant_count_in_window} registrations in {context.burst_window_seconds} seconds",
            {
                "window_seconds": context.burst_window_seconds,
                "count": context.participant_count_in_window,
            },
        )


class InstantJoinRule:
    async def evaluate(self, context: RiskContext) -> RiskSignal | None:
        if not context.giveaway_published_at:
            return None
        seconds = (context.joined_at - context.giveaway_published_at).total_seconds()
        if seconds < 0 or seconds > 10:
            return None
        return RiskSignal(
            "instant_join",
            5,
            f"Joined {max(0, int(seconds))} seconds after publication",
            {"seconds": seconds},
        )


class RequirementCompletionSpeedRule:
    async def evaluate(self, context: RiskContext) -> RiskSignal | None:
        if context.requirements_count < 2 or not context.requirement_completed_at:
            return None
        seconds = (context.requirement_completed_at - context.joined_at).total_seconds()
        if seconds < 0 or seconds > 15:
            return None
        score = min(20, 5 + context.requirements_count * 3)
        return RiskSignal(
            "requirement_completion_speed",
            score,
            f"Completed {context.requirements_count} requirements in {max(0, int(seconds))} seconds",
            {"seconds": seconds, "requirements_count": context.requirements_count},
        )


class DuplicatePatternRule:
    async def evaluate(self, context: RiskContext) -> RiskSignal | None:
        if context.duplicate_pattern_count < 2:
            return None
        score = min(25, context.duplicate_pattern_count * 5)
        return RiskSignal(
            "duplicate_pattern",
            score,
            f"Behavioral metadata pattern is shared by {context.duplicate_pattern_count} participants",
            {"matches": context.duplicate_pattern_count},
        )


class NewInteractionRule:
    async def evaluate(self, context: RiskContext) -> RiskSignal | None:
        if not context.first_interaction:
            return None
        return RiskSignal(
            "new_interaction",
            5,
            "First interaction with GiftGuard occurred immediately before participation",
        )


class ReferralAnomalyRule:
    async def evaluate(self, context: RiskContext) -> RiskSignal | None:
        if not context.referral_anomaly:
            return None
        return RiskSignal("referral_anomaly", 15, "Referral metadata has an anomalous pattern")


DEFAULT_RULES: tuple[RiskRule, ...] = (
    ParticipationBurstRule(),
    InstantJoinRule(),
    RequirementCompletionSpeedRule(),
    DuplicatePatternRule(),
    NewInteractionRule(),
    ReferralAnomalyRule(),
)
