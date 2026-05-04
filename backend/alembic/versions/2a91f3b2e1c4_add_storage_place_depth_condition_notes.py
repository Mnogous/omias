"""add storage_place dictionary, depth and condition_notes

Revision ID: 2a91f3b2e1c4
Revises: 8c43e441c4d6
Create Date: 2026-05-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '2a91f3b2e1c4'
down_revision: Union[str, Sequence[str], None] = '8c43e441c4d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'storage_places',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    with op.batch_alter_table('museum_items') as batch_op:
        batch_op.add_column(sa.Column('depth', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column(
            'storage_place_id',
            sa.Integer(),
            sa.ForeignKey('storage_places.id', name='fk_museum_items_storage_place_id'),
            nullable=True,
        ))
        batch_op.add_column(sa.Column('condition_notes', sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('museum_items') as batch_op:
        batch_op.drop_column('condition_notes')
        batch_op.drop_column('storage_place_id')
        batch_op.drop_column('depth')
    op.drop_table('storage_places')
