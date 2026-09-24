# GiftGuard v1 draw protocol

Algorithm identifier: `giftguard-v1`. All hashes/HMACs are SHA-256. Text is UTF-8. Hex digests are lowercase ASCII, not raw bytes unless explicitly specified.

1. At publication generate `secret_seed = secrets.token_hex(32)` (64 hex characters). Publish `commitment_hash = SHA256(secret_seed.encode()).hexdigest()`. Store only an encrypted seed until completion.
2. At or after ends_at, lock the giveaway row. Recalculate risk, select eligible participations, optionally exclude high risk, and sort canonical lowercase hyphenated participation UUID strings lexicographically. Freeze this array in the Draw record. Settings and requirements have been immutable since publication.
3. Canonical serialization is JSON of the UUID string array with no whitespace: `json.dumps(tickets, separators=(",", ":"), ensure_ascii=True)`. Empty pool serializes to `[]`. `participant_snapshot_hash = SHA256(serialization.encode()).hexdigest()`.
4. Obtain an entropy string. MVP `timestamp-dev` returns `timestamp-dev:` plus ends_at normalized to UTC in ISO 8601 with exactly six fractional digits and `+00:00`. Its determinism prevents retry-based timestamp rerolls, but it is predictable and does not supply independent randomness. An entropy provider contract reserves drand and Bitcoin block implementations; neither is faked.
5. `final_seed = SHA256((secret_seed + participant_snapshot_hash + external_entropy).encode()).hexdigest()`. Seed and snapshot hash have fixed lengths, so concatenation is unambiguous.
6. Start with the ordered ticket array as a mutable pool. For counter = 0, 1, ... compute `HMAC_SHA256(key=bytes.fromhex(final_seed), message=str(counter).encode())`. Interpret the 32 bytes as an unsigned big-endian integer. Use rejection sampling: for current pool size n, limit = 2**256 - (2**256 % n); discard values >= limit and advance the counter. Otherwise remove ticket at integer % n and append to winners. Continue until min(winners_count, original pool size) winners are selected. Positions start at 1. Removal prevents repeats; rejection sampling removes modulo bias.
7. Persist entropy, final seed, winners and executed_at atomically with completed status. Public reveal is allowed only after completion. The encrypted seed remains in storage; serialization explicitly decrypts it only for completed draws.

## Verification

GET `/api/public/giveaways/{id}/verification` exposes commitment before completion, but no seed, final seed, participant list or entropy. After completion it includes the canonical ticket list, requested winner count, hash, revealed seed, entropy provider, entropy string, final seed, winners (ticket UUID, Telegram ID and position) and verified boolean. POST `/api/public/giveaways/{id}/verify` recomputes from persisted material without accepting replacements from the caller.

A third-party verifier checks commitment, strictly sorted/unique/canonical UUIDs, snapshot hash, final seed, supported algorithm/provider, expected deterministic entropy and the complete ordered winner ticket list including positions. `scripts/verify_draw.py` provides a standalone standard-library implementation. The public protocol proves ticket selection, not Telegram's attribution of a ticket to a human. The database-backed verifier additionally checks winner records against frozen ticket owners.

## Threat model

Reproducibility is not sufficient proof of fairness. A malicious operator controlling publication, database and timestamp entropy could precompute favorable seeds, omit entries or rewrite history. Participants should save commitments and tickets. Production needs a future independently verifiable beacon round/block fixed before publication, externally witnessed snapshot/commitment publication, hardened seed/key storage and an audited freeze policy. Account uniqueness and fulfillment of a manually delivered prize are outside the mathematical draw proof.
