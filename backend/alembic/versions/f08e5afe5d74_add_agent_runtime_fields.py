"""add_agent_runtime_fields

Revision ID: f08e5afe5d74
Revises: a2be1393b6ef
Create Date: 2026-03-15 12:30:15.723859

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f08e5afe5d74'
down_revision: Union[str, Sequence[str], None] = 'a2be1393b6ef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 添加 Agent Runtime 相关字段到 executions 表
    op.add_column('executions', sa.Column('process_pid', sa.Integer(), nullable=True))
    op.add_column('executions', sa.Column('work_dir', sa.String(length=500), nullable=True))
    op.add_column('executions', sa.Column('log_file', sa.String(length=500), nullable=True))
    
    # 创建索引
    op.create_index(op.f('ix_executions_process_pid'), 'executions', ['process_pid'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_executions_process_pid'), table_name='executions')
    op.drop_column('executions', 'log_file')
    op.drop_column('executions', 'work_dir')
    op.drop_column('executions', 'process_pid')
