"""add_task_dependencies

Revision ID: 99631bce18c8
Revises: 20260316002920
Create Date: 2026-03-16 12:49:38.322299

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99631bce18c8'
down_revision: Union[str, Sequence[str], None] = '20260316002920'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 添加依赖关系字段
    op.add_column('tasks', sa.Column('depends_on', sa.JSON(), nullable=False, server_default='[]'))
    op.add_column('tasks', sa.Column('blocks', sa.JSON(), nullable=False, server_default='[]'))

    # 添加关联的 Plan 和 Progress 字段
    op.add_column('tasks', sa.Column('related_plan_ids', sa.JSON(), nullable=False, server_default='[]'))
    op.add_column('tasks', sa.Column('related_progress_ids', sa.JSON(), nullable=False, server_default='[]'))


def downgrade() -> None:
    """Downgrade schema."""
    # 移除添加的字段
    op.drop_column('tasks', 'related_progress_ids')
    op.drop_column('tasks', 'related_plan_ids')
    op.drop_column('tasks', 'blocks')
    op.drop_column('tasks', 'depends_on')
