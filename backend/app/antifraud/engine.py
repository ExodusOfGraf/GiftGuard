from __future__ import annotations

from dataclasses import dataclass

from app.antifraud.rules import DEFAULT_RULES, RiskContext, RiskRule, RiskSignal
from app.models import RiskLevel


@dataclass(frozen=True)
class RiskAssessment:
    score: int
    level: RiskLevel
    signals: list[RiskSignal]


class RiskEngine:
    def __init__(self, rules: tuple[RiskRule, ...] = DEFAULT_RULES) -> None:
        self.rules = rules

    async def assess(self, context: RiskContext) -> RiskAssessment:
        signals = [
            signal for rule in self.rules if (signal := await rule.evaluate(context)) is not None
        ]
        score = min(100, sum(signal.score for signal in signals))
        if score >= 60:
            level = RiskLevel.high
        elif score >= 30:
            level = RiskLevel.medium
        else:
            level = RiskLevel.low
        return RiskAssessment(score=score, level=level, signals=signals)
