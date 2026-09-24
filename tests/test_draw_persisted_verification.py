from datetime import datetime, timezone
from uuid import uuid4

import pytest
from app.config import Settings
from app.draw.protocol import (
    TimestampEntropyProvider,
    encrypt_secret_seed,
    make_draw_result,
)
from app.models import Draw, Giveaway, GiveawayStatus, Winner
from app.services.draw import DrawVerifier


@pytest.mark.asyncio
async def test_persisted_draw_verifier_rejects_hash_tampering():
    settings = Settings(app_secret="x" * 32, bot_token="token")
    now = datetime.now(timezone.utc)
    giveaway = Giveaway(
        id=uuid4(),
        owner_id=uuid4(),
        title="Test",
        starts_at=now,
        ends_at=now,
        winners_count=1,
        status=GiveawayStatus.completed,
    )
    seed = "a" * 64
    tickets = [str(uuid4()) for _ in range(3)]
    entropy = await TimestampEntropyProvider().get_entropy(now)
    result = make_draw_result(tickets, 1, seed, entropy)
    draw = Draw(
        id=uuid4(),
        giveaway_id=giveaway.id,
        algorithm_version="giftguard-v1",
        commitment_hash=result.commitment_hash,
        encrypted_secret_seed=encrypt_secret_seed(seed, settings.app_secret),
        participant_snapshot=result.participant_snapshot,
        participant_snapshot_hash=result.participant_snapshot_hash,
        external_entropy=entropy,
        entropy_provider="timestamp-dev",
        final_seed=result.final_seed,
        executed_at=now,
    )
    winners = [Winner(draw_id=draw.id, participation_id=result.winners[0], position=1)]
    verifier = DrawVerifier(settings)
    assert await verifier.verify(giveaway, draw, winners)
    draw.participant_snapshot_hash = "0" * 64
    assert not await verifier.verify(giveaway, draw, winners)
    draw.participant_snapshot_hash = result.participant_snapshot_hash
    draw.final_seed = "0" * 64
    assert not await verifier.verify(giveaway, draw, winners)
