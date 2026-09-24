import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    uuid_type = postgresql.UUID(as_uuid=True)
    json_type = postgresql.JSONB()
    op.create_table(
        "users",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("username", sa.String(255)),
        sa.Column("first_name", sa.String(255), nullable=False, server_default=""),
        sa.Column("last_name", sa.String(255)),
        sa.Column(
            "first_interaction_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("telegram_id"),
    )
    op.create_table(
        "giveaways",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column(
            "owner_id", uuid_type, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("winners_count", sa.Integer(), nullable=False),
        sa.Column("exclude_high_risk", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_giveaways_owner_id", "giveaways", ["owner_id"])
    op.create_index("ix_giveaways_status", "giveaways", ["status"])
    op.create_index("ix_giveaways_ends_at", "giveaways", ["ends_at"])
    op.create_table(
        "giveaway_requirements",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column(
            "giveaway_id",
            uuid_type,
            sa.ForeignKey("giveaways.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", sa.String(80), nullable=False),
        sa.Column("config", json_type, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_giveaway_requirements_giveaway_id", "giveaway_requirements", ["giveaway_id"]
    )
    op.create_table(
        "prizes",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column(
            "giveaway_id",
            uuid_type,
            sa.ForeignKey("giveaways.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", sa.String(40), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("estimated_value", sa.Numeric(18, 2)),
        sa.Column("currency", sa.String(10)),
        sa.Column("metadata", json_type, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column(
            "verification_status", sa.String(20), nullable=False, server_default="unverified"
        ),
        sa.Column(
            "verification_evidence",
            json_type,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.UniqueConstraint("giveaway_id"),
    )
    op.create_table(
        "participations",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column(
            "giveaway_id",
            uuid_type,
            sa.ForeignKey("giveaways.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id", uuid_type, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("eligibility_status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("eligibility_checked_at", sa.DateTime(timezone=True)),
        sa.Column("risk_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("risk_level", sa.String(10), nullable=False, server_default="low"),
        sa.Column("rejection_reason", sa.Text()),
        sa.Column("metadata", json_type, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.UniqueConstraint("giveaway_id", "user_id", name="uq_participation_giveaway_user"),
    )
    for col in [
        "giveaway_id",
        "user_id",
        "joined_at",
        "eligibility_status",
        "risk_score",
        "risk_level",
    ]:
        op.create_index(f"ix_participations_{col}", "participations", [col])
    op.create_table(
        "draws",
        sa.Column(
            "giveaway_id",
            uuid_type,
            sa.ForeignKey("giveaways.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("id", uuid_type, nullable=False, unique=True),
        sa.Column(
            "algorithm_version", sa.String(40), nullable=False, server_default="giftguard-v1"
        ),
        sa.Column("participant_snapshot_hash", sa.String(64)),
        sa.Column(
            "participant_snapshot", json_type, nullable=False, server_default=sa.text("'[]'::jsonb")
        ),
        sa.Column("commitment_hash", sa.String(64), nullable=False),
        sa.Column("encrypted_secret_seed", sa.Text(), nullable=False),
        sa.Column("external_entropy", sa.Text()),
        sa.Column("entropy_provider", sa.String(40)),
        sa.Column("final_seed", sa.String(64)),
        sa.Column("executed_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "winners",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column(
            "draw_id", uuid_type, sa.ForeignKey("draws.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "participation_id",
            uuid_type,
            sa.ForeignKey("participations.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("draw_id", "participation_id", name="uq_winner_ticket"),
        sa.UniqueConstraint("draw_id", "position", name="uq_winner_position"),
    )
    op.create_index("ix_winners_draw_id", "winners", ["draw_id"])


def downgrade() -> None:
    op.drop_table("winners")
    op.drop_table("draws")
    op.drop_table("participations")
    op.drop_table("prizes")
    op.drop_table("giveaway_requirements")
    op.drop_table("giveaways")
    op.drop_table("users")
