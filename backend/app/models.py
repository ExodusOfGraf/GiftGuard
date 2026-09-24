from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class GiveawayStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    active = "active"
    locked = "locked"
    drawing = "drawing"
    completed = "completed"
    cancelled = "cancelled"


class EligibilityStatus(str, enum.Enum):
    pending = "pending"
    eligible = "eligible"
    rejected = "rejected"


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class RequirementType(str, enum.Enum):
    required_channel_subscription = "required_channel_subscription"


class PrizeType(str, enum.Enum):
    telegram_gift = "telegram_gift"
    telegram_collectible = "telegram_collectible"
    ton_nft = "ton_nft"
    custom = "custom"


class VerificationStatus(str, enum.Enum):
    unverified = "unverified"
    verified = "verified"
    failed = "failed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(255))
    first_name: Mapped[str] = mapped_column(String(255), default="")
    last_name: Mapped[str | None] = mapped_column(String(255))
    first_interaction_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    giveaways: Mapped[list[Giveaway]] = relationship(back_populates="owner")
    participations: Mapped[list[Participation]] = relationship(back_populates="user")


class Giveaway(Base):
    __tablename__ = "giveaways"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[GiveawayStatus] = mapped_column(
        String(20), default=GiveawayStatus.draft, index=True
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    winners_count: Mapped[int] = mapped_column(Integer)
    exclude_high_risk: Mapped[bool] = mapped_column(Boolean, default=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped[User] = relationship(back_populates="giveaways")
    requirements: Mapped[list[GiveawayRequirement]] = relationship(
        back_populates="giveaway", cascade="all, delete-orphan"
    )
    prize: Mapped[Prize | None] = relationship(
        back_populates="giveaway", uselist=False, cascade="all, delete-orphan"
    )
    participations: Mapped[list[Participation]] = relationship(back_populates="giveaway")
    draw: Mapped[Draw | None] = relationship(back_populates="giveaway", uselist=False)


class GiveawayRequirement(Base):
    __tablename__ = "giveaway_requirements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    giveaway_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("giveaways.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[RequirementType] = mapped_column(String(80))
    config: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    giveaway: Mapped[Giveaway] = relationship(back_populates="requirements")


class Prize(Base):
    __tablename__ = "prizes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    giveaway_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("giveaways.id", ondelete="CASCADE"), unique=True
    )
    type: Mapped[PrizeType] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    estimated_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    currency: Mapped[str | None] = mapped_column(String(10))
    metadata_json: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, default=dict)
    verification_status: Mapped[VerificationStatus] = mapped_column(
        String(20), default=VerificationStatus.unverified
    )
    verification_evidence: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)

    giveaway: Mapped[Giveaway] = relationship(back_populates="prize")


class Participation(Base):
    __tablename__ = "participations"
    __table_args__ = (
        UniqueConstraint("giveaway_id", "user_id", name="uq_participation_giveaway_user"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    giveaway_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("giveaways.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    eligibility_status: Mapped[EligibilityStatus] = mapped_column(
        String(20), default=EligibilityStatus.pending, index=True
    )
    eligibility_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    risk_score: Mapped[int] = mapped_column(Integer, default=0, index=True)
    risk_level: Mapped[RiskLevel] = mapped_column(String(10), default=RiskLevel.low, index=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, default=dict)

    giveaway: Mapped[Giveaway] = relationship(back_populates="participations")
    user: Mapped[User] = relationship(back_populates="participations")
    winners: Mapped[list[Winner]] = relationship(back_populates="participation")


class Draw(Base):
    __tablename__ = "draws"

    giveaway_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("giveaways.id", ondelete="CASCADE"), primary_key=True
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    algorithm_version: Mapped[str] = mapped_column(String(40), default="giftguard-v1")
    participant_snapshot_hash: Mapped[str | None] = mapped_column(String(64))
    participant_snapshot: Mapped[list[str]] = mapped_column(JSONB, default=list)
    commitment_hash: Mapped[str] = mapped_column(String(64))
    encrypted_secret_seed: Mapped[str] = mapped_column(Text)
    external_entropy: Mapped[str | None] = mapped_column(Text)
    entropy_provider: Mapped[str | None] = mapped_column(String(40))
    final_seed: Mapped[str | None] = mapped_column(String(64))
    executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    giveaway: Mapped[Giveaway] = relationship(back_populates="draw")
    winners: Mapped[list[Winner]] = relationship(
        back_populates="draw", cascade="all, delete-orphan"
    )


class Winner(Base):
    __tablename__ = "winners"
    __table_args__ = (
        UniqueConstraint("draw_id", "participation_id", name="uq_winner_ticket"),
        UniqueConstraint("draw_id", "position", name="uq_winner_position"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    draw_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("draws.id", ondelete="CASCADE"), index=True
    )
    participation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("participations.id", ondelete="RESTRICT")
    )
    position: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    draw: Mapped[Draw] = relationship(back_populates="winners")
    participation: Mapped[Participation] = relationship(back_populates="winners")
