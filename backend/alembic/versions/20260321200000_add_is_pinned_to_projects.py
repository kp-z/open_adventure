"""add_is_pinned_to_projects

Revision ID: 20260321200000
Revises: a1bc0134c507
Create Date: 2026-03-21 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260321200000'
down_revision: Union[str, Sequence[str], None] = 'a1bc0134c507'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """添加 is_pinned 字段到 projects 表"""
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default='0'))


def downgrade() -> None:
    """移除 is_pinned 字段"""
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.drop_column('is_pinned')
