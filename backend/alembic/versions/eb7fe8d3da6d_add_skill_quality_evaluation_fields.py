"""add_skill_quality_evaluation_fields

Revision ID: eb7fe8d3da6d
Revises: 218ff150dd63
Create Date: 2026-03-04 11:36:08.794637

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'eb7fe8d3da6d'
down_revision: Union[str, Sequence[str], None] = '218ff150dd63'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add quality evaluation fields to skills table
    op.add_column('skills', sa.Column('quality_score', sa.Integer(), nullable=True))
    op.add_column('skills', sa.Column('quality_grade', sa.String(length=2), nullable=True))
    op.add_column('skills', sa.Column('quality_evaluation', sa.JSON(), nullable=True))
    op.add_column('skills', sa.Column('evaluated_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove quality evaluation fields from skills table
    op.drop_column('skills', 'evaluated_at')
    op.drop_column('skills', 'quality_evaluation')
    op.drop_column('skills', 'quality_grade')
    op.drop_column('skills', 'quality_score')
