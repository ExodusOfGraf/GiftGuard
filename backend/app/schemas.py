import re
from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models import (
    EligibilityStatus,
    GiveawayStatus,
    PrizeType,
    RequirementType,
    RiskLevel,
)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    telegram_id: int
    username: str | None
    first_name: str
    last_name: str | None


class GiveawayCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=10_000)
    starts_at: datetime
    ends_at: datetime
    winners_count: int = Field(ge=1, le=100)
    exclude_high_risk: bool = False

    @model_validator(mode="after")
    def validate_schedule(self) -> "GiveawayCreate":
        if self.starts_at.tzinfo is None or self.ends_at.tzinfo is None:
            raise ValueError("schedule timestamps must include a timezone")
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        return self


class GiveawayUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10_000)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    winners_count: int | None = Field(default=None, ge=1, le=100)
    exclude_high_risk: bool | None = None


class RequirementCreate(BaseModel):
    type: RequirementType = RequirementType.required_channel_subscription
    config: dict[str, Any]

    @field_validator("config")
    @classmethod
    def valid_channel(cls, value: dict[str, Any]) -> dict[str, Any]:
        if "chat_id" in value:
            try:
                chat_id = int(value["chat_id"])
            except (TypeError, ValueError) as exc:
                raise ValueError("chat_id must be a numeric Telegram chat ID") from exc
            if chat_id >= 0:
                raise ValueError("channel chat_id must be negative")
            return {"chat_id": chat_id}
        username = str(value.get("username", "")).lstrip("@")
        if not re.fullmatch(r"[A-Za-z0-9_]{5,32}", username):
            raise ValueError("username must be a valid public Telegram channel username")
        return {"username": username}


class PrizeCreate(BaseModel):
    type: PrizeType
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=10_000)
    estimated_value: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=10)
    metadata: dict[str, Any] = Field(default_factory=dict)


class RequirementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    type: RequirementType
    config: dict[str, Any]
    created_at: datetime


class PrizeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    type: PrizeType
    title: str
    description: str
    estimated_value: Decimal | None = None
    currency: str | None = None
    verification_status: str
    verification_evidence: dict[str, Any] = Field(default_factory=dict)


class GiveawayRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    title: str
    description: str
    status: GiveawayStatus
    starts_at: datetime
    ends_at: datetime
    winners_count: int
    exclude_high_risk: bool
    created_at: datetime
    prize: PrizeRead | None = None
    requirements: list[RequirementRead] = Field(default_factory=list)


class PublicGiveawayRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    title: str
    description: str
    status: GiveawayStatus
    starts_at: datetime
    ends_at: datetime
    winners_count: int
    prize: PrizeRead | None = None
    requirements: list[RequirementRead] = Field(default_factory=list)


class ParticipationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    giveaway_id: UUID
    joined_at: datetime
    eligibility_status: EligibilityStatus
    eligibility_checked_at: datetime | None
    risk_score: int
    risk_level: RiskLevel
    rejection_reason: str | None
    metadata: dict[str, Any] = Field(
        validation_alias="metadata_json", serialization_alias="metadata"
    )


class OwnParticipationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    giveaway_id: UUID
    joined_at: datetime
    eligibility_status: EligibilityStatus
    eligibility_checked_at: datetime | None
    rejection_reason: str | None


class ParticipantRead(ParticipationRead):
    user: UserRead


class AnalyticsRead(BaseModel):
    participants_total: int
    eligible: int
    rejected: int
    pending: int
    risk: dict[str, int]


class WinnerRead(BaseModel):
    position: int
    participation_id: UUID
    telegram_id: int


class VerificationRead(BaseModel):
    giveaway_id: UUID
    algorithm: str
    commitment_hash: str
    secret_seed: str | None = None
    participant_snapshot_hash: str | None = None
    participant_snapshot: list[str] | None = None
    external_entropy: str | None = None
    entropy_provider: str | None = None
    final_seed: str | None = None
    participants_count: int
    winners: list[WinnerRead]
    verified: bool
