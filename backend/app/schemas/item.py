from datetime import datetime, date

from pydantic import BaseModel

from app.schemas.dictionary import DictionaryResponse, FondResponse
from app.schemas.user import UserResponse


class ItemImageResponse(BaseModel):
    id: int
    file_path: str
    original_name: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class ItemCreate(BaseModel):
    name: str
    quantity: int = 1
    fond_id: int | None = None
    category_id: int | None = None
    description: str | None = None
    technique: str | None = None
    length: float | None = None
    width: float | None = None
    height: float | None = None
    depth: float | None = None
    weight: float | None = None
    dating: str | None = None
    place_of_creation: str | None = None
    author: str | None = None
    acquisition_method_id: int | None = None
    acquisition_source: str | None = None
    acquisition_date: date | None = None
    storage_place_id: int | None = None
    storage_location: str | None = None
    condition_id: int | None = None
    condition_notes: str | None = None
    notes: str | None = None
    material_ids: list[int] = []


class ItemUpdate(ItemCreate):
    name: str | None = None
    quantity: int | None = None


class ItemResponse(BaseModel):
    id: int
    inventory_number: str
    name: str
    quantity: int
    fond: FondResponse | None = None
    fond_number: str | None = None
    category: DictionaryResponse | None = None
    description: str | None = None
    technique: str | None = None
    length: float | None = None
    width: float | None = None
    height: float | None = None
    depth: float | None = None
    weight: float | None = None
    dating: str | None = None
    place_of_creation: str | None = None
    author: str | None = None
    acquisition_method: DictionaryResponse | None = None
    acquisition_source: str | None = None
    acquisition_date: date | None = None
    storage_place: DictionaryResponse | None = None
    storage_location: str | None = None
    condition: DictionaryResponse | None = None
    condition_notes: str | None = None
    notes: str | None = None
    materials: list[DictionaryResponse] = []
    images: list[ItemImageResponse] = []
    is_deleted: bool = False
    creator: UserResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ItemListResponse(BaseModel):
    items: list[ItemResponse]
    total: int
    page: int
    per_page: int


class ItemHistoryResponse(BaseModel):
    id: int
    field_name: str
    old_value: str | None = None
    new_value: str | None = None
    changed_at: datetime
    user: UserResponse

    model_config = {"from_attributes": True}
