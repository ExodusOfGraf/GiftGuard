from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import EligibilityStatus, Participation, RiskLevel


async def giveaway_analytics(session: AsyncSession, giveaway_id):
    total = int(
        await session.scalar(
            select(func.count(Participation.id)).where(Participation.giveaway_id == giveaway_id)
        )
        or 0
    )
    counts = {}
    for status in EligibilityStatus:
        counts[status.value] = int(
            await session.scalar(
                select(func.count(Participation.id)).where(
                    Participation.giveaway_id == giveaway_id,
                    Participation.eligibility_status == status.value,
                )
            )
            or 0
        )
    risk = {}
    for level in RiskLevel:
        risk[level.value] = int(
            await session.scalar(
                select(func.count(Participation.id)).where(
                    Participation.giveaway_id == giveaway_id,
                    Participation.risk_level == level.value,
                )
            )
            or 0
        )
    return {
        "participants_total": total,
        "eligible": counts["eligible"],
        "rejected": counts["rejected"],
        "pending": counts["pending"],
        "risk": risk,
    }
