"""add_microverse_character_binding

Revision ID: 20260316002920
Revises: 7ddd7ab1e1e5
Create Date: 2026-03-16 00:29:20.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20260316002920'
down_revision: Union[str, Sequence[str], None] = '7ddd7ab1e1e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'microverse_characters',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('character_name', sa.String(length=100), nullable=False, comment='角色名称（游戏中的唯一标识）'),
        sa.Column('display_name', sa.String(length=100), nullable=True, comment='显示名称'),
        sa.Column('agent_id', sa.Integer(), nullable=True, comment='绑定的 Agent ID'),
        sa.Column('current_execution_id', sa.Integer(), nullable=True, comment='当前正在执行的任务 ID'),
        sa.Column('is_working', sa.Boolean(), nullable=False, comment='是否正在工作'),
        sa.Column('meta', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['current_execution_id'], ['executions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_microverse_characters_agent_id'), 'microverse_characters', ['agent_id'], unique=False)
    op.create_index(op.f('ix_microverse_characters_character_name'), 'microverse_characters', ['character_name'], unique=True)
    op.create_index(op.f('ix_microverse_characters_current_execution_id'), 'microverse_characters', ['current_execution_id'], unique=False)
    op.create_index(op.f('ix_microverse_characters_id'), 'microverse_characters', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_microverse_characters_id'), table_name='microverse_characters')
    op.drop_index(op.f('ix_microverse_characters_current_execution_id'), table_name='microverse_characters')
    op.drop_index(op.f('ix_microverse_characters_character_name'), table_name='microverse_characters')
    op.drop_index(op.f('ix_microverse_characters_agent_id'), table_name='microverse_characters')
    op.drop_table('microverse_characters')
