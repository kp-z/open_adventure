"""add project agent relation

为 projects 表添加 agent_id 外键，建立 Project 和 Agent 的一对一关联。

Revision ID: 20260321100000
Revises: 20260320120000
Create Date: 2026-03-21 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260321100000"
down_revision: Union[str, Sequence[str], None] = "20260320120000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 添加 agent_id 列
    op.add_column(
        "projects",
        sa.Column("agent_id", sa.Integer(), nullable=True)
    )
    
    # 创建索引
    op.create_index(
        op.f("ix_projects_agent_id"),
        "projects",
        ["agent_id"],
        unique=False
    )
    
    # 创建外键约束
    op.create_foreign_key(
        "fk_projects_agent_id",
        "projects",
        "agents",
        ["agent_id"],
        ["id"],
        ondelete="SET NULL"
    )


def downgrade() -> None:
    # 删除外键约束
    op.drop_constraint("fk_projects_agent_id", "projects", type_="foreignkey")
    
    # 删除索引
    op.drop_index(op.f("ix_projects_agent_id"), table_name="projects")
    
    # 删除列
    op.drop_column("projects", "agent_id")
