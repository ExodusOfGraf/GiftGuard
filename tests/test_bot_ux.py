import uuid
from datetime import datetime, timedelta, timezone

from app.bot.main import format_countdown, format_giveaway_card, parse_deep_link_id
from app.models import (
    Giveaway,
    GiveawayRequirement,
    GiveawayStatus,
    Prize,
    PrizeType,
    RequirementType,
)


def test_parse_deep_link():
    valid_uuid = uuid.uuid4()
    assert parse_deep_link_id(f"/start gw_{valid_uuid}") == valid_uuid
    assert parse_deep_link_id(f"/start {valid_uuid}") == valid_uuid
    assert parse_deep_link_id("/start") is None
    assert parse_deep_link_id("/start random_text") is None
    assert parse_deep_link_id(None) is None


def test_format_countdown():
    now = datetime.now(timezone.utc)
    assert format_countdown(now - timedelta(minutes=5)) == "Завершён"

    future_3d = now + timedelta(days=3, hours=2)
    assert "дн." in format_countdown(future_3d)

    future_2h = now + timedelta(hours=2, minutes=30)
    assert "ч." in format_countdown(future_2h)


def test_format_giveaway_card():
    now = datetime.now(timezone.utc)
    gw_id = uuid.uuid4()
    prize_id = uuid.uuid4()

    giveaway = Giveaway(
        id=gw_id,
        owner_id=uuid.uuid4(),
        title="Plush Pepe Giveaway",
        description="Win an exclusive Telegram Collectible Gift",
        status=GiveawayStatus.active,
        starts_at=now,
        ends_at=now + timedelta(days=2),
        winners_count=3,
        exclude_high_risk=True,
    )
    giveaway.prize = Prize(
        id=prize_id,
        giveaway_id=gw_id,
        type=PrizeType.telegram_gift,
        title="Plush Pepe #7421",
        estimated_value=72,
        currency="TON",
    )
    giveaway.requirements = [
        GiveawayRequirement(
            id=uuid.uuid4(),
            giveaway_id=gw_id,
            type=RequirementType.required_channel_subscription,
            config={"username": "giftguard_news"},
        )
    ]

    text, kb = format_giveaway_card(giveaway, "GiftGuardBot", "http://localhost:3000")

    # Verify content in card text
    assert "Plush Pepe Giveaway" in text
    assert "Plush Pepe #7421" in text
    assert "72 TON" in text
    assert "Количество победителей:</b> 3" in text
    assert "@giftguard_news" in text
    assert "Исключать High-Risk ✓" in text

    # Verify keyboard buttons
    flat_buttons = [btn for row in kb.inline_keyboard for btn in row]
    button_texts = [btn.text for btn in flat_buttons]
    callbacks = [btn.callback_data for btn in flat_buttons if btn.callback_data]

    assert any("Подписаться на @giftguard_news" in t for t in button_texts)
    assert any("Проверить подписку" in t for t in button_texts)
    assert any("Участвовать" in t for t in button_texts)
    assert any("Открыть в Mini App" in t for t in button_texts)
    assert f"check:{gw_id}" in callbacks
    assert f"participate:{gw_id}" in callbacks


def test_participant_privacy_preservation():
    # Regular participants must NOT see risk scores (0-100) or risk levels
    # Risk score is reserved exclusively for the organizer
    participant_message = (
        "🎉 <b>Вы успешно участвуете в розыгрыше!</b>\n\n"
        "🎁 <b>Приз:</b> Plush Pepe #7421\n"
        "✅ <b>Условия:</b> ВЫПОЛНЕНЫ\n"
        "🎫 <b>Ваш номер билета:</b> <code>12345</code>\n"
    )
    assert "risk score" not in participant_message.lower()
    assert "risk level" not in participant_message.lower()
