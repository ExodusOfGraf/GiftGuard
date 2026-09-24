from __future__ import annotations

import re
import urllib.parse
import uuid
from datetime import datetime, timedelta, timezone
from html import escape

from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)
from sqlalchemy import select

from app.config import get_settings
from app.db import SessionLocal
from app.exceptions import DomainError
from app.integrations.telegram import TelegramMembershipChecker
from app.integrations.telegram_bot import create_bot
from app.models import Giveaway, GiveawayStatus, User
from app.repositories import GiveawayRepository, UserRepository
from app.schemas import GiveawayCreate, PrizeCreate, RequirementCreate
from app.services.draw import DrawService
from app.services.eligibility import EligibilityService
from app.services.giveaway import GiveawayService
from app.services.participation import ParticipationService


class GiveawayWizard(StatesGroup):
    title = State()
    description = State()
    prize_type = State()
    prize_title = State()
    duration = State()
    winners_count = State()
    channels = State()
    exclude_high_risk = State()


def parse_deep_link_id(text: str | None) -> uuid.UUID | None:
    if not text:
        return None
    parts = text.strip().split()
    if len(parts) < 2:
        return None
    raw = parts[1].strip()
    if raw.startswith("gw_"):
        raw = raw[3:]
    try:
        return uuid.UUID(raw)
    except ValueError:
        return None


def format_countdown(ends_at: datetime) -> str:
    now = datetime.now(timezone.utc)
    if ends_at <= now:
        return "Завершён"
    diff = ends_at - now
    hours = int(diff.total_seconds() // 3600)
    minutes = int((diff.total_seconds() % 3600) // 60)
    if hours >= 24:
        days = hours // 24
        return f"Осталось {days} дн. {hours % 24} ч."
    return f"Осталось {hours} ч. {minutes} мин."


def format_giveaway_card(
    giveaway: Giveaway, bot_username: str, frontend_url: str
) -> tuple[str, InlineKeyboardMarkup]:
    status_map = {
        GiveawayStatus.draft: "📝 Черновик (не опубликован)",
        GiveawayStatus.scheduled: "⏳ Запланирован",
        GiveawayStatus.active: "🟢 Активен (идёт сбор участников)",
        GiveawayStatus.locked: "🔒 Приём заявок завершён (ожидает розыгрыша)",
        GiveawayStatus.drawing: "🎲 Проводится розыгрыш...",
        GiveawayStatus.completed: "✅ Завершён (победители определены)",
        GiveawayStatus.cancelled: "❌ Отменён",
    }
    status_text = status_map.get(giveaway.status, str(giveaway.status))

    prize_str = "Не указан"
    if giveaway.prize:
        p = giveaway.prize
        type_icons = {
            "telegram_gift": "🎁 Telegram Gift",
            "telegram_collectible": "🌟 Collectible Gift",
            "ton_nft": "🖼️ TON NFT",
            "custom": "🎯 Приз",
        }
        type_label = type_icons.get(p.type, "🎁 Приз")
        val_str = f" (~{p.estimated_value} {p.currency or 'TON'})" if p.estimated_value else ""
        prize_str = f"{type_label}: <b>{escape(p.title)}</b>{val_str}"

    ends_str = giveaway.ends_at.strftime("%d.%m.%Y в %H:%M UTC")
    countdown = format_countdown(giveaway.ends_at)

    lines = [
        f"🎁 <b>{escape(giveaway.title)}</b>",
        f"<i>{escape(giveaway.description)}</i>" if giveaway.description else "",
        "",
        "━━━━━━━━━━━━━━━━━━━━━━",
        f"🎁 <b>Приз:</b> {prize_str}",
        f"🏆 <b>Количество победителей:</b> {giveaway.winners_count}",
        f"📊 <b>Статус:</b> {status_text}",
        f"⏰ <b>Дедлайн:</b> {ends_str} (<i>{countdown}</i>)",
        f"🛡️ <b>Anti-Farm:</b> {'Исключать High-Risk ✓' if giveaway.exclude_high_risk else 'Все участники'}",
    ]

    reqs = giveaway.requirements or []
    if reqs:
        lines.append("")
        lines.append("📋 <b>Обязательные каналы для подписки:</b>")
        for idx, req in enumerate(reqs, start=1):
            ch_name = req.config.get("username")
            if ch_name:
                clean = ch_name.replace("@", "")
                lines.append(
                    f' {idx}. 📢 <a href="https://t.me/{escape(clean, quote=True)}">@{escape(clean)}</a>'
                )
            elif req.config.get("chat_id"):
                lines.append(f" {idx}. 📢 ID канала: <code>{req.config.get('chat_id')}</code>")

    lines.append("━━━━━━━━━━━━━━━━━━━━━━")
    lines.append(
        "<i>Результат розыгрыша воспроизводим и доступен для публичной проверки. На MVP используется предсказуемая timestamp entropy.</i>"
    )

    text = "\n".join(line for line in lines if line is not None)

    # Keyboard buttons
    buttons: list[list[InlineKeyboardButton]] = []

    # 1. Links to required channels
    for req in reqs:
        ch_name = req.config.get("username")
        if ch_name:
            clean = ch_name.replace("@", "")
            buttons.append(
                [
                    InlineKeyboardButton(
                        text=f"📢 Подписаться на @{clean}", url=f"https://t.me/{clean}"
                    )
                ]
            )

    # 2. Main Action buttons
    if giveaway.status == GiveawayStatus.active:
        action_row = []
        if reqs:
            action_row.append(
                InlineKeyboardButton(
                    text="🔍 Проверить подписку", callback_data=f"check:{giveaway.id}"
                )
            )
        action_row.append(
            InlineKeyboardButton(text="🎁 Участвовать", callback_data=f"participate:{giveaway.id}")
        )
        buttons.append(action_row)
    elif giveaway.status == GiveawayStatus.completed:
        buttons.append(
            [
                InlineKeyboardButton(
                    text="🏆 Победители и честность",
                    web_app={"url": f"{frontend_url}/giveaways/{giveaway.id}/results"},
                )
            ]
        )

    # 3. Mini App and Share
    deep_link = f"https://t.me/{bot_username}?start=gw_{giveaway.id}" if bot_username else ""
    share_text = urllib.parse.quote(
        f"Участвуй в прозрачном розыгрыше подарка «{giveaway.title}» в GiftGuard!"
    )
    share_url = (
        f"https://t.me/share/url?url={urllib.parse.quote(deep_link)}&text={share_text}"
        if deep_link
        else ""
    )

    bottom_row = [
        InlineKeyboardButton(
            text="🌐 Открыть в Mini App", web_app={"url": f"{frontend_url}/giveaways/{giveaway.id}"}
        )
    ]
    if share_url:
        bottom_row.append(InlineKeyboardButton(text="↗️ Поделиться", url=share_url))
    buttons.append(bottom_row)

    return text, InlineKeyboardMarkup(inline_keyboard=buttons)


def build_dispatcher(bot: Bot) -> Dispatcher:
    dp = Dispatcher(storage=RedisStorage.from_url(get_settings().redis_url))

    @dp.message(CommandStart())
    async def start(message: Message):
        if not message.from_user:
            return

        settings = get_settings()
        async with SessionLocal() as session:
            await UserRepository(session).get_or_create(
                message.from_user.id,
                username=message.from_user.username,
                first_name=message.from_user.first_name,
                last_name=message.from_user.last_name,
            )
            await session.commit()

        # Check deep link payload: e.g. /start gw_<uuid>
        giveaway_id = parse_deep_link_id(message.text)
        if giveaway_id:
            async with SessionLocal() as session:
                giveaway = await GiveawayRepository(session).get(giveaway_id)
                if giveaway:
                    bot_info = await bot.get_me()
                    text, kb = format_giveaway_card(
                        giveaway, bot_info.username or "", settings.frontend_url
                    )
                    await message.answer(text, reply_markup=kb, disable_web_page_preview=True)
                    return
                else:
                    await message.answer(
                        "⚠️ Розыгрыш с таким идентификатором не найден или был удалён."
                    )

        # Default start menu
        bot_info = await bot.get_me()
        kb = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="🌐 Открыть Mini App Дашборд", web_app={"url": settings.frontend_url}
                    )
                ],
                [
                    InlineKeyboardButton(text="➕ Создать розыгрыш", callback_data="menu:create"),
                    InlineKeyboardButton(
                        text="📋 Мои розыгрыши", callback_data="menu:my_giveaways"
                    ),
                ],
                [InlineKeyboardButton(text="ℹ️ Помощь и команды", callback_data="menu:help")],
            ]
        )
        await message.answer(
            f"🛡️ <b>Добро пожаловать в GiftGuard, {message.from_user.first_name}!</b>\n\n"
            "<b>GiftGuard</b> — это платформа для проведения защищённых розыгрышей Telegram Gifts, collectible Gifts и NFT.\n\n"
            "• <b>Анти-фарм</b>: защита от накруток и ферм мультиаккаунтов.\n"
            "• <b>Provably Fair</b>: криптографическое доказательство честности розыгрыша.\n"
            "• <b>Прозрачность</b>: проверка условий и публичная верификация победителей.\n\n"
            "Используйте кнопки ниже для быстрого доступа или отправьте ссылку на розыгрыш.",
            reply_markup=kb,
        )

    @dp.message(Command("help"))
    async def help_command(message: Message):
        settings = get_settings()
        await message.answer(
            "📖 <b>Команды GiftGuard:</b>\n\n"
            "• <code>/start</code> — Главное меню\n"
            "• <code>/create</code> — Пошаговый мастер создания розыгрыша\n"
            "• <code>/my_giveaways</code> — Список созданных вами розыгрышей\n"
            "• <code>/giveaway &lt;id&gt;</code> — Карточка розыгрыша и участие\n"
            "• <code>/draw &lt;id&gt;</code> — Подвести итоги розыгрыша (для организатора)\n\n"
            "💡 Вы также можете открыть полноценный интерфейс в Telegram Mini App:",
            reply_markup=InlineKeyboardMarkup(
                inline_keyboard=[
                    [
                        InlineKeyboardButton(
                            text="🌐 Открыть Mini App", web_app={"url": settings.frontend_url}
                        )
                    ]
                ]
            ),
        )

    @dp.callback_query(F.data == "menu:help")
    async def menu_help(callback: CallbackQuery):
        await callback.answer()
        if callback.message:
            await help_command(callback.message)

    @dp.callback_query(F.data == "menu:create")
    async def menu_create(callback: CallbackQuery, state: FSMContext):
        await callback.answer()
        if callback.message:
            await create_start(callback.message, state)

    @dp.callback_query(F.data == "menu:my_giveaways")
    async def menu_my_giveaways(callback: CallbackQuery):
        await callback.answer()
        if callback.message:
            await my_giveaways(callback.message)

    # -------------------------------------------------------------
    # Giveaways list & details
    # -------------------------------------------------------------
    @dp.message(Command("my_giveaways"))
    async def my_giveaways(message: Message):
        if not message.from_user:
            return
        async with SessionLocal() as session:
            user = await session.scalar(
                select(User).where(User.telegram_id == message.from_user.id)
            )
            if not user:
                await message.answer("Сначала нажмите /start.")
                return
            items = await GiveawayRepository(session).list_for_owner(user.id)

        if not items:
            await message.answer(
                "У вас пока нет созданных розыгрышей.\nНажмите /create, чтобы запустить первый розыгрыш!",
                reply_markup=InlineKeyboardMarkup(
                    inline_keyboard=[
                        [
                            InlineKeyboardButton(
                                text="➕ Создать розыгрыш", callback_data="menu:create"
                            )
                        ]
                    ]
                ),
            )
            return

        settings = get_settings()
        buttons = []
        for item in items[:15]:
            status_emoji = (
                "🟢"
                if item.status == "active"
                else "📝"
                if item.status == "draft"
                else "✅"
                if item.status == "completed"
                else "⚪"
            )
            buttons.append(
                [
                    InlineKeyboardButton(
                        text=f"{status_emoji} {item.title[:25]}",
                        callback_data=f"show_gw:{item.id}",
                    )
                ]
            )
        buttons.append(
            [
                InlineKeyboardButton(
                    text="🌐 Управление в Mini App",
                    web_app={"url": f"{settings.frontend_url}/dashboard"},
                )
            ]
        )

        await message.answer(
            f"📋 <b>Ваши розыгрыши ({len(items)}):</b>\nНажмите на розыгрыш для просмотра карточки:",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
        )

    @dp.callback_query(F.data.startswith("show_gw:"))
    async def callback_show_giveaway(callback: CallbackQuery):
        if not callback.from_user:
            return
        giveaway_id_str = callback.data.split(":", 1)[1]
        try:
            giveaway_id = uuid.UUID(giveaway_id_str)
        except ValueError:
            await callback.answer("Неверный ID", show_alert=True)
            return

        settings = get_settings()
        async with SessionLocal() as session:
            giveaway = await GiveawayRepository(session).get(giveaway_id)
            if not giveaway:
                await callback.answer("Розыгрыш не найден", show_alert=True)
                return
            bot_info = await bot.get_me()
            text, kb = format_giveaway_card(
                giveaway, bot_info.username or "", settings.frontend_url
            )
            await callback.answer()
            if callback.message:
                await callback.message.answer(text, reply_markup=kb, disable_web_page_preview=True)

    @dp.message(Command("giveaway"))
    async def giveaway_info(message: Message):
        parts = (message.text or "").split(maxsplit=1)
        if len(parts) != 2:
            await message.answer(
                "Использование: <code>/giveaway &lt;id&gt;</code>\nПример: <code>/giveaway 8f31d044-8848-...</code>"
            )
            return
        try:
            giveaway_id = uuid.UUID(parts[1].strip())
        except ValueError:
            await message.answer("Неверный формат UUID розыгрыша.")
            return

        settings = get_settings()
        async with SessionLocal() as session:
            giveaway = await GiveawayRepository(session).get(giveaway_id)
            if not giveaway:
                await message.answer("Розыгрыш не найден.")
                return
            bot_info = await bot.get_me()
            text, kb = format_giveaway_card(
                giveaway, bot_info.username or "", settings.frontend_url
            )
            await message.answer(text, reply_markup=kb, disable_web_page_preview=True)

    # -------------------------------------------------------------
    # Eligibility check & Participation callbacks
    # -------------------------------------------------------------
    @dp.callback_query(F.data.startswith("check:"))
    async def check_eligibility_callback(callback: CallbackQuery):
        if not callback.from_user:
            return
        try:
            giveaway_id = uuid.UUID(callback.data.split(":", 1)[1])
        except ValueError:
            await callback.answer("Неверный ID розыгрыша", show_alert=True)
            return

        async with SessionLocal() as session:
            giveaway = await GiveawayRepository(session).get(giveaway_id)
            if not giveaway:
                await callback.answer("Розыгрыш не найден", show_alert=True)
                return

            user = await UserRepository(session).get_or_create(
                callback.from_user.id,
                username=callback.from_user.username,
                first_name=callback.from_user.first_name,
                last_name=callback.from_user.last_name,
            )
            checker = TelegramMembershipChecker(bot)
            status, reason, obs = await EligibilityService(checker).check(giveaway, user)

        if status == "eligible":
            await callback.answer(
                "✅ Все обязательные условия выполнены!\nНажмите «🎁 Участвовать» для регистрации билета.",
                show_alert=True,
            )
        elif status == "pending":
            await callback.answer(
                "⏳ Проверка каналов временно недоступна.\nУбедитесь, что бот добавлен администратором в каналы, и попробуйте позже.",
                show_alert=True,
            )
        else:
            missing_channels = []
            for check in obs.get("checks", []):
                if not check.get("subscribed"):
                    req = next(
                        (
                            r
                            for r in giveaway.requirements
                            if str(r.id) == check.get("requirement_id")
                        ),
                        None,
                    )
                    if req and req.config.get("username"):
                        missing_channels.append(f"@{req.config['username']}")
            missing_text = ", ".join(missing_channels) if missing_channels else "некоторые каналы"
            await callback.answer(
                f"❌ Вы не подписаны на {missing_text}!\nПодпишитесь на каналы по ссылкам выше и проверьте снова.",
                show_alert=True,
            )

    @dp.callback_query(F.data.startswith("participate:"))
    async def participate_callback(callback: CallbackQuery):
        if not callback.from_user:
            return
        try:
            giveaway_id = uuid.UUID(callback.data.split(":", 1)[1])
        except ValueError:
            await callback.answer("Неверный ID", show_alert=True)
            return

        settings = get_settings()
        try:
            async with SessionLocal() as session:
                user = await UserRepository(session).get_or_create(
                    callback.from_user.id,
                    username=callback.from_user.username,
                    first_name=callback.from_user.first_name,
                    last_name=callback.from_user.last_name,
                )
                giveaway = await GiveawayRepository(session).get(giveaway_id)
                if not giveaway:
                    await callback.answer("Розыгрыш не найден", show_alert=True)
                    return

                item = await ParticipationService(
                    session, TelegramMembershipChecker(bot)
                ).participate(giveaway_id, user, metadata={"source": "telegram_bot"})
                await session.commit()

            await callback.answer("Участие зарегистрировано! 🎉")

            # Privacy-preserving response (no risk score exposure to regular users!)
            prize_title = escape(giveaway.prize.title if giveaway.prize else giveaway.title)
            ends_str = giveaway.ends_at.strftime("%d.%m.%Y в %H:%M UTC")

            if item.eligibility_status == "eligible":
                msg_text = (
                    "🎉 <b>Вы успешно участвуете в розыгрыше!</b>\n\n"
                    f"🎁 <b>Приз:</b> {prize_title}\n"
                    "✅ <b>Условия:</b> ВЫПОЛНЕНЫ\n"
                    f"🎫 <b>Ваш номер билета:</b> <code>{item.id}</code>\n"
                    f"⏰ <b>Итоги:</b> {ends_str}\n"
                    f"🏆 <b>Количество победителей:</b> {giveaway.winners_count}\n\n"
                    "<i>Победитель определяется алгоритмом Provably Fair (HMAC-SHA256 + Rejection Sampling). "
                    "Результат воспроизводим и прозрачно проверяем.</i>"
                )
            elif item.eligibility_status == "pending":
                msg_text = (
                    "⏳ <b>Участие зарегистрировано с проверкой</b>\n\n"
                    f"🎫 <b>Номер билета:</b> <code>{item.id}</code>\n"
                    "⚠️ Проверка одного или нескольких каналов временно в ожидании. "
                    "Мы автоматически перепроверим подписку ближе к моменту розыгрыша."
                )
            else:
                msg_text = (
                    "❌ <b>Условия участия пока не выполнены!</b>\n\n"
                    f"🎫 Билет зарегистрирован: <code>{item.id}</code>\n"
                    "⚠️ Вы не подписались на один или несколько обязательных каналов. "
                    "Пожалуйста, подпишитесь на все каналы из описания и нажмите «🔍 Проверить подписку»."
                )

            kb = InlineKeyboardMarkup(
                inline_keyboard=[
                    [
                        InlineKeyboardButton(
                            text="🌐 Посмотреть статус в Mini App",
                            web_app={"url": f"{settings.frontend_url}/giveaways/{giveaway_id}"},
                        )
                    ]
                ]
            )
            if callback.message:
                await callback.message.answer(msg_text, reply_markup=kb)

        except DomainError as exc:
            await callback.answer(str(exc), show_alert=True)

    # -------------------------------------------------------------
    # Organizer Manual Draw Command
    # -------------------------------------------------------------
    @dp.message(Command("draw"))
    async def manual_draw_command(message: Message):
        if not message.from_user:
            return
        parts = (message.text or "").split(maxsplit=1)
        if len(parts) != 2:
            await message.answer("Использование: <code>/draw &lt;id&gt;</code>")
            return
        try:
            giveaway_id = uuid.UUID(parts[1].strip())
        except ValueError:
            await message.answer("Неверный формат UUID розыгрыша.")
            return

        settings = get_settings()
        async with SessionLocal() as session:
            giveaway = await GiveawayRepository(session).get(giveaway_id)
            if not giveaway:
                await message.answer("Розыгрыш не найден.")
                return

            user = await session.scalar(
                select(User).where(User.telegram_id == message.from_user.id)
            )
            if not user or giveaway.owner_id != user.id:
                await message.answer("⛔ Вы не являетесь организатором этого розыгрыша.")
                return

            now = datetime.now(timezone.utc)
            if now < giveaway.ends_at:
                await message.answer(
                    f"⏳ Розыгрыш можно провести только после окончания дедлайна ({giveaway.ends_at.strftime('%d.%m.%Y в %H:%M UTC')})."
                )
                return

            if giveaway.status == GiveawayStatus.completed:
                await message.answer("✅ Этот розыгрыш уже проведён ранее.")
                return

            try:
                draw = await DrawService(session, settings).execute(giveaway_id)
                await session.commit()
            except DomainError as exc:
                await message.answer(f"❌ Ошибка проведения розыгрыша: {exc}")
                return

        await message.answer(
            f"🎉 <b>Честный розыгрыш успешно проведён!</b>\n\n"
            f"🎁 <b>{escape(giveaway.title)}</b>\n"
            f"🎲 <b>Final Seed:</b> <code>{draw.final_seed}</code>\n"
            f"🏆 <b>Отобрано победителей:</b> {min(giveaway.winners_count, len(draw.participant_snapshot))}\n\n"
            "Результаты и криптографическое доказательство честности доступны по ссылке:",
            reply_markup=InlineKeyboardMarkup(
                inline_keyboard=[
                    [
                        InlineKeyboardButton(
                            text="🏆 Открыть результаты в Mini App",
                            web_app={
                                "url": f"{settings.frontend_url}/giveaways/{giveaway_id}/results"
                            },
                        )
                    ]
                ]
            ),
        )

    # -------------------------------------------------------------
    # Interactive Creation Wizard
    # -------------------------------------------------------------
    @dp.message(Command("create"))
    async def create_start(message: Message, state: FSMContext):
        await state.clear()
        await state.set_state(GiveawayWizard.title)
        await message.answer(
            "🚀 <b>Создание нового розыгрыша GiftGuard (Шаг 1 из 6)</b>\n\n"
            "Введите название розыгрыша:\n"
            "<i>(например: Plush Pepe NFT Giveaway #42)</i>"
        )

    @dp.message(GiveawayWizard.title)
    async def wizard_title(message: Message, state: FSMContext):
        title = (message.text or "").strip()
        if not title:
            await message.answer("Пожалуйста, введите непустое название:")
            return
        await state.update_data(title=title)
        await state.set_state(GiveawayWizard.description)
        await message.answer(
            "📝 <b>Описание розыгрыша (Шаг 2 из 6)</b>\n\n"
            "Введите текст описания и условий (или отправьте <code>-</code>, чтобы пропустить):"
        )

    @dp.message(GiveawayWizard.description)
    async def wizard_description(message: Message, state: FSMContext):
        text = message.text or ""
        desc = "" if text.strip() == "-" else text.strip()
        await state.update_data(description=desc)
        await state.set_state(GiveawayWizard.prize_type)

        kb = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="🎁 Telegram Gift", callback_data="wiz_ptype:telegram_gift"
                    ),
                    InlineKeyboardButton(
                        text="🌟 Collectible Gift", callback_data="wiz_ptype:telegram_collectible"
                    ),
                ],
                [
                    InlineKeyboardButton(text="🖼️ TON NFT", callback_data="wiz_ptype:ton_nft"),
                    InlineKeyboardButton(text="🎯 Другой приз", callback_data="wiz_ptype:custom"),
                ],
            ]
        )
        await message.answer("🎁 <b>Выберите тип приза (Шаг 3 из 6):</b>", reply_markup=kb)

    @dp.callback_query(GiveawayWizard.prize_type, F.data.startswith("wiz_ptype:"))
    async def wizard_prize_type(callback: CallbackQuery, state: FSMContext):
        ptype = callback.data.split(":", 1)[1]
        await state.update_data(prize_type=ptype)
        await callback.answer()
        await state.set_state(GiveawayWizard.prize_title)
        if callback.message:
            await callback.message.answer(
                "🏷️ <b>Название и стоимость приза (Шаг 4 из 6)</b>\n\n"
                "Введите название приза и ориентировочную стоимость через разделитель <code>|</code>:\n"
                "<i>Пример: Plush Pepe #7421 | 72 TON</i>\n"
                "<i>Или просто название: Plush Pepe #7421</i>"
            )

    @dp.message(GiveawayWizard.prize_title)
    async def wizard_prize_title(message: Message, state: FSMContext):
        raw = (message.text or "").strip()
        if "|" in raw:
            parts = raw.split("|", 1)
            p_title = parts[0].strip()
            p_val_str = parts[1].strip()
        else:
            p_title = raw
            p_val_str = ""

        await state.update_data(prize_title=p_title, prize_value=p_val_str)
        await state.set_state(GiveawayWizard.duration)

        kb = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(text="⚡ 24 часа", callback_data="wiz_dur:24"),
                    InlineKeyboardButton(text="🗓️ 3 дня", callback_data="wiz_dur:72"),
                    InlineKeyboardButton(text="📅 7 дней", callback_data="wiz_dur:168"),
                ],
            ]
        )
        await message.answer(
            "⏳ <b>Длительность розыгрыша (Шаг 5 из 6)</b>\n\n"
            "Выберите период или введите количество часов вручную:",
            reply_markup=kb,
        )

    @dp.callback_query(GiveawayWizard.duration, F.data.startswith("wiz_dur:"))
    async def wizard_duration_callback(callback: CallbackQuery, state: FSMContext):
        hours = int(callback.data.split(":", 1)[1])
        await apply_duration(hours, callback.message, state)
        await callback.answer()

    @dp.message(GiveawayWizard.duration)
    async def wizard_duration_text(message: Message, state: FSMContext):
        try:
            hours = int((message.text or "").strip())
            if hours < 1 or hours > 8760:
                raise ValueError
        except ValueError:
            await message.answer("Пожалуйста, введите положительное число часов (например: 48):")
            return
        await apply_duration(hours, message, state)

    async def apply_duration(hours: int, msg: Message | None, state: FSMContext):
        now = datetime.now(timezone.utc)
        ends_at = now + timedelta(hours=hours)
        await state.update_data(starts_at=now.isoformat(), ends_at=ends_at.isoformat())
        await state.set_state(GiveawayWizard.winners_count)

        kb = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(text="1", callback_data="wiz_win:1"),
                    InlineKeyboardButton(text="3", callback_data="wiz_win:3"),
                    InlineKeyboardButton(text="5", callback_data="wiz_win:5"),
                    InlineKeyboardButton(text="10", callback_data="wiz_win:10"),
                ]
            ]
        )
        if msg:
            await msg.answer("🏆 <b>Количество победителей:</b>", reply_markup=kb)

    @dp.callback_query(GiveawayWizard.winners_count, F.data.startswith("wiz_win:"))
    async def wizard_winners_callback(callback: CallbackQuery, state: FSMContext):
        count = int(callback.data.split(":", 1)[1])
        await state.update_data(winners_count=count, channels=[])
        await callback.answer()
        await state.set_state(GiveawayWizard.channels)
        if callback.message:
            await callback.message.answer(
                "📢 <b>Обязательные каналы для подписки (Шаг 6 из 6)</b>\n\n"
                "Отправьте юзернейм канала (например: <code>@giftguard_news</code>).\n"
                "Вы можете отправить несколько каналов по очереди.\n\n"
                "Когда закончите или если каналы не нужны, нажмите кнопку ниже:",
                reply_markup=InlineKeyboardMarkup(
                    inline_keyboard=[
                        [
                            InlineKeyboardButton(
                                text="✅ Завершить настройку каналов", callback_data="wiz_chan:done"
                            )
                        ]
                    ]
                ),
            )

    @dp.message(GiveawayWizard.channels)
    async def wizard_add_channel(message: Message, state: FSMContext):
        text = (message.text or "").strip()
        data = await state.get_data()
        channels: list[str] = data.get("channels", [])

        clean = text if text.startswith("@") or text.startswith("-100") else f"@{text}"
        if clean not in channels:
            channels.append(clean)
            await state.update_data(channels=channels)

        ch_list = "\n".join(f"• {c}" for c in channels)
        await message.answer(
            f"Канал <b>{clean}</b> добавлен!\n\n"
            f"Текущие обязательные каналы:\n{ch_list}\n\n"
            "Отправьте еще один канал или завершите настройку:",
            reply_markup=InlineKeyboardMarkup(
                inline_keyboard=[
                    [
                        InlineKeyboardButton(
                            text="✅ Завершить настройку", callback_data="wiz_chan:done"
                        )
                    ]
                ]
            ),
        )

    @dp.callback_query(GiveawayWizard.channels, F.data == "wiz_chan:done")
    async def wizard_channels_done(callback: CallbackQuery, state: FSMContext):
        await callback.answer()

        # Final step: exclude high risk toggle
        kb = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="🛡️ Исключать High-Risk: ДА (Рекомендуется)",
                        callback_data="wiz_risk:yes",
                    ),
                ],
                [
                    InlineKeyboardButton(
                        text="⚪ Разрешать всех допущенных", callback_data="wiz_risk:no"
                    ),
                ],
            ]
        )
        if callback.message:
            await callback.message.answer(
                "🛡️ <b>Защита от ферм (Anti-Farm Scoring)</b>\n\n"
                "Исключать участников с высоким риском накрутки (Score ≥ 60) из пула победителей?",
                reply_markup=kb,
            )

    @dp.callback_query(F.data.startswith("wiz_risk:"))
    async def wizard_finish(callback: CallbackQuery, state: FSMContext):
        exclude_hr = callback.data == "wiz_risk:yes"
        await callback.answer()

        data = await state.get_data()
        if not callback.from_user or not data.get("title"):
            await state.clear()
            return

        settings = get_settings()
        async with SessionLocal() as session:
            user = await UserRepository(session).get_or_create(
                callback.from_user.id,
                username=callback.from_user.username,
                first_name=callback.from_user.first_name,
                last_name=callback.from_user.last_name,
            )
            # Create Giveaway
            giveaway = await GiveawayService(session, settings).create(
                user,
                GiveawayCreate(
                    title=data["title"],
                    description=data.get("description", ""),
                    starts_at=datetime.fromisoformat(data["starts_at"]),
                    ends_at=datetime.fromisoformat(data["ends_at"]),
                    winners_count=data.get("winners_count", 1),
                    exclude_high_risk=exclude_hr,
                ),
            )

            # Set Prize
            prize_val_raw = data.get("prize_value", "")
            est_val = None
            curr = "TON"
            if prize_val_raw:
                # Try parsing value and currency e.g. "72 TON"
                match = re.search(r"([\d\.]+)\s*([a-zA-Z]+)?", prize_val_raw)
                if match:
                    est_val = float(match.group(1))
                    if match.group(2):
                        curr = match.group(2).upper()

            await GiveawayService(session, settings).set_prize(
                user,
                giveaway.id,
                PrizeCreate(
                    type=data.get("prize_type", "telegram_gift"),
                    title=data.get("prize_title", "Telegram Gift"),
                    estimated_value=est_val,
                    currency=curr,
                ),
            )

            # Add requirements
            for ch in data.get("channels", []):
                cfg = (
                    {"chat_id": ch} if ch.startswith("-100") else {"username": ch.replace("@", "")}
                )
                requirement = RequirementCreate(config=cfg)
                await GiveawayService(session, settings).add_requirement(
                    user, giveaway.id, requirement
                )

            # Automatically publish if scheduled or ready
            try:
                giveaway = await GiveawayService(session, settings).publish(user, giveaway.id)
            except DomainError as exc:
                await session.rollback()
                await callback.message.answer(
                    f"Не удалось опубликовать giveaway: {escape(str(exc))}"
                )
                return

            await session.commit()

        await state.clear()
        bot_info = await bot.get_me()
        deep_link = f"https://t.me/{bot_info.username}?start=gw_{giveaway.id}"
        share_text = urllib.parse.quote(
            f"Участвуй в прозрачном розыгрыше подарка «{giveaway.title}» в GiftGuard!"
        )

        kb = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="📢 Поделиться розыгрышем",
                        url=f"https://t.me/share/url?url={urllib.parse.quote(deep_link)}&text={share_text}",
                    )
                ],
                [
                    InlineKeyboardButton(
                        text="🌐 Управление в Mini App",
                        web_app={"url": f"{settings.frontend_url}/giveaways/{giveaway.id}"},
                    ),
                    InlineKeyboardButton(
                        text="👀 Посмотреть карточку", callback_data=f"show_gw:{giveaway.id}"
                    ),
                ],
            ]
        )

        if callback.message:
            await callback.message.answer(
                f"🎉 <b>Розыгрыш успешно создан и опубликован!</b>\n\n"
                f"🎁 <b>{escape(giveaway.title)}</b>\n"
                f"📊 Статус: <b>{giveaway.status}</b>\n"
                f"🏆 Победителей: <b>{giveaway.winners_count}</b>\n"
                f"⏰ Окончание: <b>{giveaway.ends_at.strftime('%d.%m.%Y в %H:%M UTC')}</b>\n\n"
                f"🔗 <b>Прямая ссылка для участников (поделитесь в канале):</b>\n"
                f"<code>{deep_link}</code>",
                reply_markup=kb,
            )

    return dp


async def run_bot() -> None:
    settings = get_settings()
    if not settings.bot_token:
        raise RuntimeError("BOT_TOKEN is required to run the bot")
    bot = create_bot(
        settings.bot_token,
        proxy_url=settings.telegram_proxy_url,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    try:
        await build_dispatcher(bot).start_polling(bot)
    finally:
        await bot.session.close()
