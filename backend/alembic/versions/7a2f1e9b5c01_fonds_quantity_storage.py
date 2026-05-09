"""fonds, quantity, storage as text

Revision ID: 7a2f1e9b5c01
Revises: 2a91f3b2e1c4
Create Date: 2026-05-08 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7a2f1e9b5c01"
down_revision: Union[str, Sequence[str], None] = "2a91f3b2e1c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


FOND_SEED = [
    ("Технический фонд", "Т"),
    ("Фонд моделей и макетов", "ММ"),
    ("Документальный фонд", "Д"),
    ("Мемориальный фонд", "МЕМ"),
    ("Фонд фотоматериалов", "Ф"),
    ("Фонд ИЗО и ДПИ", "ИЗО"),
    ("Фонд медиаискусства", "МИ"),
    ("Фонд фалеристики", "ФЛ"),
    ("Фонд форменной одежды", "ФО"),
    ("Книжный фонд", "К"),
    ("Предметный фонд", "П"),
    ("Научно-вспомогательный фонд", "НВ"),
]


def upgrade() -> None:
    op.create_table(
        "fonds",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("last_number", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("code"),
    )

    fonds_table = sa.table(
        "fonds",
        sa.column("name", sa.String),
        sa.column("code", sa.String),
        sa.column("last_number", sa.Integer),
    )
    op.bulk_insert(
        fonds_table,
        [{"name": n, "code": c, "last_number": 0} for n, c in FOND_SEED],
    )

    op.add_column(
        "museum_items",
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column("museum_items", sa.Column("fond_id", sa.Integer(), nullable=True))
    op.add_column("museum_items", sa.Column("fond_number", sa.String(length=100), nullable=True))
    op.create_foreign_key("fk_museum_items_fond", "museum_items", "fonds", ["fond_id"], ["id"])
    op.create_index("ix_museum_items_fond_number", "museum_items", ["fond_number"])

    op.add_column("museum_items", sa.Column("storage_location_text", sa.String(length=500), nullable=True))
    op.execute(
        """
        UPDATE museum_items
        SET storage_location_text = sl.name
        FROM storage_locations sl
        WHERE museum_items.storage_location_id = sl.id
        """
    )
    op.drop_constraint("museum_items_storage_location_id_fkey", "museum_items", type_="foreignkey")
    op.drop_column("museum_items", "storage_location_id")
    op.alter_column("museum_items", "storage_location_text", new_column_name="storage_location")

    op.drop_table("storage_locations")


def downgrade() -> None:
    op.create_table(
        "storage_locations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.alter_column("museum_items", "storage_location", new_column_name="storage_location_text")
    op.add_column("museum_items", sa.Column("storage_location_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "museum_items_storage_location_id_fkey",
        "museum_items",
        "storage_locations",
        ["storage_location_id"],
        ["id"],
    )
    op.drop_column("museum_items", "storage_location_text")

    op.drop_index("ix_museum_items_fond_number", table_name="museum_items")
    op.drop_constraint("fk_museum_items_fond", "museum_items", type_="foreignkey")
    op.drop_column("museum_items", "fond_number")
    op.drop_column("museum_items", "fond_id")
    op.drop_column("museum_items", "quantity")

    op.drop_table("fonds")
