from datetime import datetime, timezone, date

from sqlalchemy import String, Text, ForeignKey, DateTime, Date, Boolean, Float, Integer, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

item_materials = Table(
    "item_materials",
    Base.metadata,
    Column("item_id", Integer, ForeignKey("museum_items.id", ondelete="CASCADE"), primary_key=True),
    Column("material_id", Integer, ForeignKey("materials.id", ondelete="CASCADE"), primary_key=True),
)


class MuseumItem(Base):
    __tablename__ = "museum_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    inventory_number: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(500))
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    technique: Mapped[str | None] = mapped_column(String(500), nullable=True)
    length: Mapped[float | None] = mapped_column(Float, nullable=True)
    width: Mapped[float | None] = mapped_column(Float, nullable=True)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    dating: Mapped[str | None] = mapped_column(String(255), nullable=True)
    place_of_creation: Mapped[str | None] = mapped_column(String(500), nullable=True)
    author: Mapped[str | None] = mapped_column(String(500), nullable=True)
    acquisition_method_id: Mapped[int | None] = mapped_column(ForeignKey("acquisition_methods.id"), nullable=True)
    acquisition_source: Mapped[str | None] = mapped_column(String(500), nullable=True)
    acquisition_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    storage_location_id: Mapped[int | None] = mapped_column(ForeignKey("storage_locations.id"), nullable=True)
    condition_id: Mapped[int | None] = mapped_column(ForeignKey("conditions.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    category = relationship("Category", lazy="joined")
    storage_location = relationship("StorageLocation", lazy="joined")
    condition = relationship("Condition", lazy="joined")
    acquisition_method = relationship("AcquisitionMethod", lazy="joined")
    materials = relationship("Material", secondary=item_materials, lazy="joined")
    images = relationship("ItemImage", back_populates="item", cascade="all, delete-orphan", lazy="selectin")
    creator = relationship("User", lazy="joined")


class ItemImage(Base):
    __tablename__ = "item_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("museum_items.id", ondelete="CASCADE"))
    file_path: Mapped[str] = mapped_column(String(500))
    original_name: Mapped[str] = mapped_column(String(500))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    item = relationship("MuseumItem", back_populates="images")


class ItemHistory(Base):
    __tablename__ = "item_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("museum_items.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    field_name: Mapped[str] = mapped_column(String(100))
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", lazy="joined")
