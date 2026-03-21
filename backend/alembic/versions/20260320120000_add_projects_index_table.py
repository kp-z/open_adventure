"""add projects index table

Revision ID: 20260320120000
Revises: 5a317a64114d
Create Date: 2026-03-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260320120000"
down_revision: Union[str, Sequence[str], None] = "5a317a64114d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("path", sa.String(length=1024), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("has_agent", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("has_workspace", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("workspace_port", sa.Integer(), nullable=True),
        sa.Column("git_remote", sa.String(length=500), nullable=True),
        sa.Column("git_branch", sa.String(length=200), nullable=True),
        sa.Column("last_sync_at", sa.DateTime(), nullable=True),
        sa.Column("meta", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_projects_id"), "projects", ["id"], unique=False)
    op.create_index(op.f("ix_projects_path"), "projects", ["path"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_projects_path"), table_name="projects")
    op.drop_index(op.f("ix_projects_id"), table_name="projects")
    op.drop_table("projects")
