from __future__ import annotations

import hmac
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import Settings
from app.draw.protocol import (
    ALGORITHM_VERSION,
    TimestampEntropyProvider,
    canonical_tickets,
    decrypt_secret_seed,
    make_draw_result,
)
from app.models import Draw, Giveaway, GiveawayStatus, Participation, Winner


async def _verify_completed(
    giveaway: Giveaway, draw: Draw, winners: list[Winner], settings: Settings
) -> bool:
    if draw.algorithm_version != ALGORITHM_VERSION or draw.entropy_provider != "timestamp-dev":
        return False
    if not all(
        (draw.participant_snapshot_hash, draw.external_entropy, draw.final_seed, draw.executed_at)
    ):
        return False
    tickets = draw.participant_snapshot
    try:
        if tickets != canonical_tickets(tickets):
            return False
        if draw.external_entropy != await TimestampEntropyProvider().get_entropy(giveaway.ends_at):
            return False
        seed = decrypt_secret_seed(draw.encrypted_secret_seed, settings.app_secret)
        expected = make_draw_result(tickets, giveaway.winners_count, seed, draw.external_entropy)
    except (ValueError, TypeError):
        return False
    if not (
        hmac.compare_digest(expected.commitment_hash, draw.commitment_hash)
        and hmac.compare_digest(expected.participant_snapshot_hash, draw.participant_snapshot_hash)
        and hmac.compare_digest(expected.final_seed, draw.final_seed)
    ):
        return False
    actual = [str(winner.participation_id) for winner in winners]
    positions = [winner.position for winner in winners]
    return positions == list(range(1, len(winners) + 1)) and actual == expected.winners


async def public_verification(
    session: AsyncSession, settings: Settings, giveaway_id: uuid.UUID
) -> dict:
    giveaway = await session.scalar(
        select(Giveaway)
        .options(
            selectinload(Giveaway.draw)
            .selectinload(Draw.winners)
            .selectinload(Winner.participation)
            .selectinload(Participation.user)
        )
        .where(Giveaway.id == giveaway_id)
    )
    if not giveaway or not giveaway.draw:
        raise KeyError("giveaway not found")
    draw = giveaway.draw
    base = {
        "giveaway_id": giveaway.id,
        "algorithm": draw.algorithm_version,
        "commitment_hash": draw.commitment_hash,
        "participants_count": 0,
        "winners": [],
        "verified": False,
    }
    if giveaway.status != GiveawayStatus.completed or not draw.executed_at:
        return base
    winners = sorted(draw.winners, key=lambda item: item.position)
    seed = decrypt_secret_seed(draw.encrypted_secret_seed, settings.app_secret)
    base.update(
        secret_seed=seed,
        participant_snapshot_hash=draw.participant_snapshot_hash,
        participant_snapshot=draw.participant_snapshot,
        external_entropy=draw.external_entropy,
        entropy_provider=draw.entropy_provider,
        final_seed=draw.final_seed,
        participants_count=len(draw.participant_snapshot),
        winners=[
            {
                "position": item.position,
                "participation_id": item.participation_id,
                "telegram_id": item.participation.user.telegram_id,
            }
            for item in winners
        ],
        verified=await _verify_completed(giveaway, draw, winners, settings),
    )
    return base


async def verify_public_draw(
    session: AsyncSession, settings: Settings, giveaway_id: uuid.UUID
) -> bool:
    manifest = await public_verification(session, settings, giveaway_id)
    return bool(manifest.get("verified"))
