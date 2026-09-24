from datetime import datetime, timezone

import pytest
from app.antifraud.engine import RiskEngine
from app.antifraud.rules import RiskContext


@pytest.mark.asyncio
async def test_risk_boundaries() -> None:
    now = datetime.now(timezone.utc)
    low = await RiskEngine().assess(RiskContext(now, now, None))
    assert low.score == 5
    assert low.level.value == "low"

    medium = await RiskEngine().assess(
        RiskContext(now, now, now, participant_count_in_window=200, requirements_count=3)
    )
    assert 30 <= medium.score < 60
    assert medium.level.value == "medium"

    high = await RiskEngine().assess(
        RiskContext(
            now,
            now,
            now,
            participant_count_in_window=500,
            duplicate_pattern_count=10,
            requirements_count=5,
            first_interaction=True,
            referral_anomaly=True,
        )
    )
    assert high.score >= 60
    assert high.level.value == "high"
