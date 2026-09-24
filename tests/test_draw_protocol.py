import pytest
from app.draw.protocol import make_draw_result, snapshot_hash, verify_draw


def test_same_input_is_deterministic() -> None:
    args = (["b", "a", "c"], 2, "a" * 64, "entropy")
    first = make_draw_result(*args)
    second = make_draw_result(*args)
    assert first.winners == second.winners
    assert first.participant_snapshot == ["a", "b", "c"]


def test_different_entropy_changes_result() -> None:
    first = make_draw_result(["a", "b", "c", "d", "e"], 2, "a" * 64, "one")
    second = make_draw_result(["a", "b", "c", "d", "e"], 2, "a" * 64, "two")
    assert first.final_seed != second.final_seed
    assert first.winners != second.winners


def test_no_duplicate_winners_and_verifier_detects_tampering() -> None:
    result = make_draw_result(["a", "b", "c", "d"], 4, "a" * 64, "entropy")
    assert len(result.winners) == len(set(result.winners)) == 4
    assert verify_draw(
        result.participant_snapshot, result.winners, 4, "a" * 64, result.commitment_hash, "entropy"
    )
    assert not verify_draw(
        result.participant_snapshot,
        result.winners[::-1],
        4,
        "a" * 64,
        result.commitment_hash,
        "entropy",
    )


def test_snapshot_hash_rejects_duplicate_tickets() -> None:
    with pytest.raises(ValueError):
        snapshot_hash(["same", "same"])
