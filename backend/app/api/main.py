from __future__ import annotations

import uuid
from typing import Annotated

from aiogram import Bot
from fastapi import (
    APIRouter,
    Depends,
    FastAPI,
    Header,
    HTTPException,
    Query,
    Request,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from redis.asyncio import Redis, from_url
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import TelegramWebAppUser, validate_init_data
from app.config import get_settings
from app.db import get_session
from app.exceptions import (
    AuthorizationError,
    DomainError,
    InvalidTransition,
    NotFoundError,
)
from app.integrations.telegram import TelegramMembershipChecker
from app.models import Draw, Giveaway, Participation, User
from app.repositories import ParticipationRepository, UserRepository
from app.schemas import (
    AnalyticsRead,
    GiveawayCreate,
    GiveawayRead,
    GiveawayUpdate,
    OwnParticipationRead,
    ParticipantRead,
    PrizeCreate,
    PublicGiveawayRead,
    RequirementCreate,
)
from app.services.analytics import giveaway_analytics
from app.services.draw import DrawService
from app.services.giveaway import GiveawayService
from app.services.participation import ParticipationService
from app.services.verification import public_verification, verify_public_draw

router = APIRouter(prefix="/api")
SessionDep = Annotated[AsyncSession, Depends(get_session)]


def current_bot(request: Request):
    return getattr(request.app.state, "bot", None)


async def enforce_participation_rate_limit(request: Request, telegram_id: int) -> None:
    redis: Redis | None = getattr(request.app.state, "redis", None)
    if redis is None:
        return
    key = f"giftguard:participate:{telegram_id}"
    try:
        count = int(await redis.incr(key))
        if count == 1:
            await redis.expire(key, 60)
        if count > get_settings().rate_limit_per_minute:
            raise HTTPException(status_code=429, detail="participation rate limit exceeded")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="rate limiter unavailable") from exc


async def current_user(
    request: Request,
    session: SessionDep,
    x_telegram_init_data: Annotated[str | None, Header()] = None,
) -> User:
    try:
        payload: TelegramWebAppUser = validate_init_data(x_telegram_init_data or "", get_settings())
    except AuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    user = await UserRepository(session).get_or_create(
        payload.telegram_id,
        username=payload.username,
        first_name=payload.first_name,
        last_name=payload.last_name,
    )
    await session.flush()
    return user


UserDep = Annotated[User, Depends(current_user)]


def handle_domain_error(exc: DomainError) -> HTTPException:
    if isinstance(exc, AuthorizationError):
        return HTTPException(status_code=403, detail=str(exc))
    if isinstance(exc, NotFoundError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, InvalidTransition):
        return HTTPException(status_code=409, detail=str(exc))
    return HTTPException(status_code=400, detail=str(exc))


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/giveaways", response_model=GiveawayRead, status_code=201)
async def create_giveaway(data: GiveawayCreate, session: SessionDep, user: UserDep):
    try:
        item = await GiveawayService(session, get_settings()).create(user, data)
        await session.commit()
        await session.refresh(item)
        return item
    except DomainError as exc:
        raise handle_domain_error(exc)


@router.get("/giveaways", response_model=list[GiveawayRead])
async def list_giveaways(session: SessionDep, user: UserDep):
    items = await GiveawayService(session, get_settings()).repo.list_for_owner(user.id)
    return items


@router.get("/giveaways/{giveaway_id}", response_model=GiveawayRead)
async def get_giveaway(giveaway_id: uuid.UUID, session: SessionDep, user: UserDep):
    try:
        return await GiveawayService(session, get_settings()).get_owned(user, giveaway_id)
    except DomainError as exc:
        raise handle_domain_error(exc)


@router.patch("/giveaways/{giveaway_id}", response_model=GiveawayRead)
async def update_giveaway(
    giveaway_id: uuid.UUID, data: GiveawayUpdate, session: SessionDep, user: UserDep
):
    try:
        item = await GiveawayService(session, get_settings()).update(user, giveaway_id, data)
        await session.commit()
        return item
    except (DomainError, ValueError) as exc:
        if isinstance(exc, DomainError):
            raise handle_domain_error(exc)
        raise HTTPException(status_code=422, detail=str(exc))


@router.post("/giveaways/{giveaway_id}/publish", response_model=GiveawayRead)
async def publish_giveaway(giveaway_id: uuid.UUID, session: SessionDep, user: UserDep):
    try:
        item = await GiveawayService(session, get_settings()).publish(user, giveaway_id)
        await session.commit()
        return item
    except DomainError as exc:
        raise handle_domain_error(exc)


@router.post("/giveaways/{giveaway_id}/cancel", response_model=GiveawayRead)
async def cancel_giveaway(giveaway_id: uuid.UUID, session: SessionDep, user: UserDep):
    try:
        item = await GiveawayService(session, get_settings()).cancel(user, giveaway_id)
        await session.commit()
        return item
    except DomainError as exc:
        raise handle_domain_error(exc)


@router.post("/giveaways/{giveaway_id}/requirements", status_code=201)
async def add_giveaway_requirement(
    giveaway_id: uuid.UUID, data: RequirementCreate, session: SessionDep, user: UserDep
):
    try:
        requirement = await GiveawayService(session, get_settings()).add_requirement(
            user, giveaway_id, data
        )
        await session.commit()
        return {"id": requirement.id, "type": requirement.type, "config": requirement.config}
    except DomainError as exc:
        raise handle_domain_error(exc)


@router.delete("/giveaways/{giveaway_id}/requirements/{requirement_id}", status_code=204)
async def delete_giveaway_requirement(
    giveaway_id: uuid.UUID, requirement_id: uuid.UUID, session: SessionDep, user: UserDep
):
    try:
        giveaway = await GiveawayService(session, get_settings()).get_owned(user, giveaway_id)
        requirement = next(
            (item for item in giveaway.requirements if item.id == requirement_id), None
        )
        if not requirement:
            raise NotFoundError("requirement not found")
        if giveaway.status != "draft":
            raise InvalidTransition("requirements are immutable after publication")
        await session.delete(requirement)
        await session.commit()
    except DomainError as exc:
        raise handle_domain_error(exc)


@router.post("/giveaways/{giveaway_id}/prize", status_code=201)
async def set_giveaway_prize(
    giveaway_id: uuid.UUID, data: PrizeCreate, session: SessionDep, user: UserDep
):
    try:
        prize = await GiveawayService(session, get_settings()).set_prize(user, giveaway_id, data)
        await session.commit()
        return {
            "id": prize.id,
            "type": prize.type,
            "title": prize.title,
            "verification_status": prize.verification_status,
        }
    except DomainError as exc:
        raise handle_domain_error(exc)


@router.get("/giveaways/{giveaway_id}/prize")
async def get_giveaway_prize(giveaway_id: uuid.UUID, session: SessionDep, user: UserDep):
    try:
        giveaway = await GiveawayService(session, get_settings()).get_owned(user, giveaway_id)
        return giveaway.prize
    except DomainError as exc:
        raise handle_domain_error(exc)


@router.post("/giveaways/{giveaway_id}/participate", response_model=OwnParticipationRead)
async def participate(
    giveaway_id: uuid.UUID,
    request: Request,
    session: SessionDep,
    user: UserDep,
):
    await enforce_participation_rate_limit(request, user.telegram_id)
    # The unique database key remains the final idempotency guard.
    metadata = {"user_agent": request.headers.get("user-agent", "")[:200]}
    try:
        item = await ParticipationService(
            session, TelegramMembershipChecker(current_bot(request))
        ).participate(giveaway_id, user, metadata)
        await session.commit()
        return item
    except DomainError as exc:
        raise handle_domain_error(exc)


@router.get("/giveaways/{giveaway_id}/participation/me", response_model=OwnParticipationRead)
async def my_participation(giveaway_id: uuid.UUID, session: SessionDep, user: UserDep):
    item = await ParticipationRepository(session).get_for_user(giveaway_id, user.id)
    if not item:
        raise HTTPException(status_code=404, detail="participation not found")
    return item


@router.get("/giveaways/{giveaway_id}/participants", response_model=list[ParticipantRead])
async def list_participants(
    giveaway_id: uuid.UUID,
    session: SessionDep,
    user: UserDep,
    eligibility_status: str | None = Query(default=None),
    risk_level: str | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
):
    try:
        await GiveawayService(session, get_settings()).get_owned(user, giveaway_id)
        statement = (
            select(Participation)
            .options(selectinload(Participation.user))
            .where(Participation.giveaway_id == giveaway_id)
        )
        if eligibility_status:
            statement = statement.where(Participation.eligibility_status == eligibility_status)
        if risk_level:
            statement = statement.where(Participation.risk_level == risk_level)
        items = await session.scalars(
            statement.order_by(Participation.joined_at.asc()).offset(offset).limit(limit)
        )
        result = list(items.all())
        return result
    except DomainError as exc:
        raise handle_domain_error(exc)


@router.get("/giveaways/{giveaway_id}/analytics", response_model=AnalyticsRead)
async def analytics(giveaway_id: uuid.UUID, session: SessionDep, user: UserDep):
    try:
        await GiveawayService(session, get_settings()).get_owned(user, giveaway_id)
        return await giveaway_analytics(session, giveaway_id)
    except DomainError as exc:
        raise handle_domain_error(exc)


@router.post("/giveaways/{giveaway_id}/draw")
async def draw_giveaway(giveaway_id: uuid.UUID, session: SessionDep, user: UserDep):
    try:
        await GiveawayService(session, get_settings()).get_owned(user, giveaway_id)
        draw = await DrawService(session, get_settings()).execute(giveaway_id)
        await session.commit()
        return {"draw_id": draw.id, "status": "completed", "final_seed": draw.final_seed}
    except DomainError as exc:
        raise handle_domain_error(exc)


@router.get("/giveaways/{giveaway_id}/draw")
async def get_draw(giveaway_id: uuid.UUID, session: SessionDep, user: UserDep):
    try:
        await GiveawayService(session, get_settings()).get_owned(user, giveaway_id)
        draw = await session.scalar(select(Draw).where(Draw.giveaway_id == giveaway_id))
        if not draw:
            raise NotFoundError("draw not found")
        return {
            "id": draw.id,
            "commitment_hash": draw.commitment_hash,
            "executed_at": draw.executed_at,
            "final_seed": draw.final_seed,
        }
    except DomainError as exc:
        raise handle_domain_error(exc)


@router.get("/public/giveaways/{giveaway_id}", response_model=PublicGiveawayRead)
async def get_public_giveaway(giveaway_id: uuid.UUID, session: SessionDep):
    giveaway = await session.scalar(
        select(Giveaway)
        .options(
            selectinload(Giveaway.requirements),
            selectinload(Giveaway.prize),
        )
        .where(Giveaway.id == giveaway_id)
    )
    if not giveaway:
        raise HTTPException(status_code=404, detail="giveaway not found")
    return giveaway


@router.get("/public/giveaways/{giveaway_id}/verification")
async def get_public_verification(giveaway_id: uuid.UUID, session: SessionDep):
    try:
        return await public_verification(session, get_settings(), giveaway_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/public/giveaways/{giveaway_id}/verify")
async def verify_public(giveaway_id: uuid.UUID, session: SessionDep):
    try:
        return {
            "giveaway_id": giveaway_id,
            "verified": await verify_public_draw(session, get_settings(), giveaway_id),
        }
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


def create_app() -> FastAPI:
    app = FastAPI(title="GiftGuard API", version="0.1.0")
    settings = get_settings()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)

    @app.on_event("startup")
    async def open_redis() -> None:
        app.state.redis = from_url(settings.redis_url, decode_responses=True)
        app.state.bot = Bot(settings.bot_token) if settings.bot_token else None

    @app.on_event("shutdown")
    async def close_redis() -> None:
        redis = getattr(app.state, "redis", None)
        if redis:
            await redis.aclose()
        bot = getattr(app.state, "bot", None)
        if bot:
            await bot.session.close()

    @app.exception_handler(DomainError)
    async def domain_handler(_: Request, exc: DomainError):
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    return app


app = create_app()
