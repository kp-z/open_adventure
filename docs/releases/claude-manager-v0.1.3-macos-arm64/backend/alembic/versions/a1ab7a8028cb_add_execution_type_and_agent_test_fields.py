"""add execution type and agent test fields

Revision ID: a1ab7a8028cb
Revises: 3ff2a3d14c23
Create Date: 2026-02-26 18:44:48.294135

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1ab7a8028cb'
down_revision: Union[str, Sequence[str], None] = '3ff2a3d14c23'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('executions',
        sa.Column('execution_type', sa.String(20), nullable=False, server_default='workflow')
    )
    op.add_column('executions',
        sa.Column('agent_id', sa.Integer(), nullable=True)
    )
    op.add_column('executions',
        sa.Column('test_input', sa.String(5000), nullable=True)
    )
    op.add_column('executions',
        sa.Column('test_output', sa.Text(), nullable=True)
    )
    op.create_index('ix_executions_execution_type', 'executions', ['execution_type'])
    op.create_index('ix_executions_agent_id', 'executions', ['agent_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_executions_agent_id')
    op.drop_index('ix_executions_execution_type')
    op.drop_column('executions', 'test_output')
    op.drop_column('executions', 'test_input')
    op.drop_column('executions', 'agent_id')
    op.drop_column('executions', 'execution_type')
