from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol

ALGORITHM_VERSION = "giftguard-v1"


class EntropyProvider(Protocol):
    name: str

    async def get_entropy(self, ends_at: datetime) -> str: ...


class TimestampEntropyProvider:
    name = "timestamp-dev"

    async def get_entropy(self, ends_at: datetime) -> str:
        value = ends_at.astimezone(timezone.utc).isoformat(timespec="microseconds")
        return f"timestamp-dev:{value}"


def commitment(secret_seed: str) -> str:
    return hashlib.sha256(secret_seed.encode("utf-8")).hexdigest()


def canonical_tickets(tickets: list[str]) -> list[str]:
    result = sorted(str(ticket).lower() for ticket in tickets)
    if len(result) != len(set(result)):
        raise ValueError("ticket list contains duplicates")
    return result


def snapshot_hash(tickets: list[str]) -> str:
    ordered = canonical_tickets(tickets)
    payload = json.dumps(ordered, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def final_seed(secret_seed: str, participant_snapshot_hash: str, external_entropy: str) -> str:
    payload = f"{secret_seed}{participant_snapshot_hash}{external_entropy}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def deterministic_winners(tickets: list[str], winners_count: int, seed_hex: str) -> list[str]:
    pool = canonical_tickets(tickets)
    target = min(max(winners_count, 0), len(pool))
    winners: list[str] = []
    counter = 0
    modulus = 1 << 256
    while pool and len(winners) < target:
        digest = hmac.new(
            bytes.fromhex(seed_hex), str(counter).encode("ascii"), hashlib.sha256
        ).digest()
        value = int.from_bytes(digest, "big")
        counter += 1
        limit = modulus - (modulus % len(pool))
        if value >= limit:
            continue
        winners.append(pool.pop(value % len(pool)))
    return winners


def generate_secret_seed() -> str:
    return secrets.token_hex(32)


def encrypt_secret_seed(seed: str, app_secret: str) -> str:
    # Fernet derives a key from an application secret; this ciphertext is safe to store in PostgreSQL.
    import base64

    from cryptography.fernet import Fernet

    key = hashlib.sha256(app_secret.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(key)).encrypt(seed.encode("utf-8")).decode("ascii")


def decrypt_secret_seed(ciphertext: str, app_secret: str) -> str:
    import base64

    from cryptography.fernet import Fernet, InvalidToken

    key = hashlib.sha256(app_secret.encode("utf-8")).digest()
    try:
        return (
            Fernet(base64.urlsafe_b64encode(key))
            .decrypt(ciphertext.encode("ascii"))
            .decode("ascii")
        )
    except InvalidToken as exc:
        raise ValueError("unable to decrypt secret seed") from exc


@dataclass(frozen=True)
class DrawResult:
    participant_snapshot: list[str]
    participant_snapshot_hash: str
    commitment_hash: str
    secret_seed: str
    external_entropy: str
    final_seed: str
    winners: list[str]


def make_draw_result(
    tickets: list[str],
    winners_count: int,
    secret_seed: str,
    external_entropy: str,
) -> DrawResult:
    ordered = canonical_tickets(tickets)
    snap_hash = snapshot_hash(ordered)
    fin_seed = final_seed(secret_seed, snap_hash, external_entropy)
    return DrawResult(
        participant_snapshot=ordered,
        participant_snapshot_hash=snap_hash,
        commitment_hash=commitment(secret_seed),
        secret_seed=secret_seed,
        external_entropy=external_entropy,
        final_seed=fin_seed,
        winners=deterministic_winners(ordered, winners_count, fin_seed),
    )


def verify_draw(
    tickets: list[str],
    winners: list[str],
    winners_count: int,
    secret_seed: str,
    commitment_hash: str,
    external_entropy: str,
) -> bool:
    if not hmac.compare_digest(commitment(secret_seed), commitment_hash):
        return False
    expected = make_draw_result(tickets, winners_count, secret_seed, external_entropy)
    return expected.winners == [str(item).lower() for item in winners]
