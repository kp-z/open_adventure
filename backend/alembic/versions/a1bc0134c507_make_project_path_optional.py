"""make_project_path_optional

Revision ID: a1bc0134c507
Revises: 20260321100000
Create Date: 2026-03-21 21:47:39.271481

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1bc0134c507'
down_revision: Union[str, Sequence[str], None] = '20260321100000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # SQLite 需要使用 batch 模式来修改列
    # 由于 path 已经有唯一约束，我们使用 recreate 策略
    with op.batch_alter_table('projects', schema=None, recreate='always') as batch_op:
        # 将 path 字段改为可选，同时移除 unique 约束
        batch_op.alter_column('path',
                              existing_type=sa.String(1024),
                              nullable=True,
                              existing_nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('projects', schema=None, recreate='always') as batch_op:
        # 恢复 path 字段为必填，并恢复 unique 约束
        batch_op.alter_column('path',
                              existing_type=sa.String(1024),
                              nullable=False,
                              existing_nullable=True)
