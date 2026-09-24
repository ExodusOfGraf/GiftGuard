# GiftGuard

GiftGuard is a Telegram service for giveaways of Telegram Gifts and collectible NFTs. It checks participation requirements, retains explainable anti-farm signals, and publishes a reproducible draw proof.

## Architecture

FastAPI, aiogram and an ARQ worker form one Python application boundary backed by PostgreSQL and Redis. Next.js is a Telegram Mini App and organizer dashboard. The HTTP API and bot call the same service layer. See [docs/architecture.md](docs/architecture.md), [docs/domain-model.md](docs/domain-model.md) and [docs/draw-protocol.md](docs/draw-protocol.md).

## Local setup

1. Copy `.env.example` to `.env` and set a random `APP_SECRET` and `BOT_TOKEN`.
2. Run:

```bash
cp .env.example .env
docker compose up --build
```

API health is at http://localhost:8000/api/health and dashboard at http://localhost:3000.

The backend container runs `alembic upgrade head` before starting FastAPI. If you run locally, install `backend/requirements.txt`, set `PYTHONPATH=backend`, and run `uvicorn app.main:app --reload`.

## Migrations

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend alembic revision --autogenerate -m "change"
```

## Tests

```bash
docker compose exec backend pytest
```

Tests cover deterministic draw, rejection sampling properties, tamper detection, risk levels, Telegram WebApp auth, eligibility and bot presentation. Run the command from the project root when testing outside Docker.

## Telegram bot setup

Create a bot with BotFather and set `BOT_TOKEN`. The bot needs administrator access in each required channel or supergroup because Telegram only guarantees `getChatMember` checks for other users when the bot is an administrator. Configure a menu or main Mini App URL to `FRONTEND_URL`.

The bot supports `/start`, `/help`, `/create`, `/my_giveaways`, `/giveaway <id>`, `/draw <id>` and inline participation. Its wizard collects prize and channel requirements and publishes the giveaway. The dashboard also supports creating drafts and publishing them.

## Mini App setup

Set the bot menu button or main Mini App to `https://your-domain/`. The Mini App sends `Telegram.WebApp.initData` in `X-Telegram-Init-Data`; the server validates HMAC, auth age and duplicate fields. Do not use `initDataUnsafe` for identity.

## Draw algorithm

GiftGuard v1 commits to a 32-byte cryptographically secure seed at publication. After `ends_at`, the service sorts eligible participation UUIDs, hashes canonical compact JSON, obtains deterministic development timestamp entropy, derives a SHA-256 final seed and selects without replacement using HMAC-SHA256 plus rejection sampling. The seed is encrypted at rest and revealed only after completion. Anyone can fetch the public manifest and recompute it; `POST /api/public/giveaways/{id}/verify` repeats server verification.

Timestamp entropy is a predictable local development provider. It gives reproducibility but does not provide operator-independent randomness. Production startup is intentionally blocked while this is the only provider. A future external beacon provider and a committed round must be implemented before deployment. Gift ownership verification also remains unverified until a chain/Telegram integration is implemented.

## Security and limitations

Secrets are environment variables. Authenticated endpoints require validated Telegram initData and owner authorization. Participation is idempotent through a unique constraint, high-risk exclusion is explicit, and Telegram API errors yield pending eligibility. No account age, device fingerprint or NFT ownership data is fabricated.

The ARQ worker activates scheduled giveaways, rechecks pending/rejected subscriptions before the deadline, and closes expired giveaways each minute. It recalculates risk before freezing the draw snapshot. A Docker build and an online migration against PostgreSQL still need to be exercised on a host with Docker installed.
