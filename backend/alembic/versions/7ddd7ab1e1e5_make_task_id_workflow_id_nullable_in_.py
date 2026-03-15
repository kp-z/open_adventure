"""make_task_id_workflow_id_nullable_in_executions

Revision ID: 7ddd7ab1e1e5
Revises: f08e5afe5d74
Create Date: 2026-03-15 14:33:49.330139

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7ddd7ab1e1e5'
down_revision: Union[str, Sequence[str], None] = 'f08e5afe5d74'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # SQLite 不支持直接修改列约束，需要使用 batch_alter_table
    with op.batch_alter_table('executions', schema=None) as batch_op:
        batch_op.alter_column('task_id',
                              existing_type=sa.Integer(),
                              nullable=True)
        batch_op.alter_column('workflow_id',
                              existing_type=sa.Integer(),
                              nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('executions', schema=None) as batch_op:
        batch_op.alter_column('task_id',
                              existing_type=sa.Integer(),
                              nullable=False)
        batch_op.alter_column('workflow_id',
                              existing_type=sa.Integer(),
                              nullable=False)
