"""add_project_paths_table

Revision ID: 56ca36338846
Revises: a1ab7a8028cb
Create Date: 2026-02-27 18:27:46.499139

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '56ca36338846'
down_revision: Union[str, Sequence[str], None] = 'a1ab7a8028cb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
