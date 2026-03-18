"""add_testing_tables

Revision ID: 5a317a64114d
Revises: 99631bce18c8
Create Date: 2026-03-17 22:31:26.610319

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5a317a64114d'
down_revision: Union[str, Sequence[str], None] = '99631bce18c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 创建 test_nodes 表
    op.create_table(
        'test_nodes',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('parent_id', sa.String(), nullable=True),
        sa.Column('test_file', sa.String(), nullable=True),
        sa.Column('test_command', sa.String(), nullable=False, server_default='pytest'),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['parent_id'], ['test_nodes.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_test_nodes_parent_id'), 'test_nodes', ['parent_id'], unique=False)

    # 创建 test_executions 表
    op.create_table(
        'test_executions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('test_node_id', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('duration', sa.Integer(), nullable=True),
        sa.Column('total_tests', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('passed_tests', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failed_tests', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('skipped_tests', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_tests', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('output', sa.Text(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['test_node_id'], ['test_nodes.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_test_executions_test_node_id'), 'test_executions', ['test_node_id'], unique=False)
    op.create_index(op.f('ix_test_executions_started_at'), 'test_executions', ['started_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_test_executions_started_at'), table_name='test_executions')
    op.drop_index(op.f('ix_test_executions_test_node_id'), table_name='test_executions')
    op.drop_table('test_executions')
    op.drop_index(op.f('ix_test_nodes_parent_id'), table_name='test_nodes')
    op.drop_table('test_nodes')
