import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.item import MuseumItem, ItemImage, ItemHistory, item_materials
from app.models.dictionary import Material, Category, StorageLocation, Condition
from app.models.settings import SystemSetting
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse, ItemListResponse, ItemHistoryResponse
from app.services.audit import log_action

router = APIRouter(prefix="/items", tags=["Музейные предметы"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def _next_inventory_number(db: Session) -> str:
    setting = db.query(SystemSetting).filter(SystemSetting.key == "inventory_template").first()
    template = setting.value if setting else settings.INVENTORY_NUMBER_TEMPLATE
    last = db.query(func.max(MuseumItem.id)).scalar() or 0
    return template.format(number=last + 1)


def _track_changes(db: Session, item: MuseumItem, data: dict, user_id: int):
    for field, new_val in data.items():
        if field == "material_ids":
            continue
        old_val = getattr(item, field, None)
        if str(old_val) != str(new_val):
            db.add(ItemHistory(
                item_id=item.id,
                user_id=user_id,
                field_name=field,
                old_value=str(old_val) if old_val is not None else None,
                new_value=str(new_val) if new_val is not None else None,
            ))


@router.get("/", response_model=ItemListResponse)
def list_items(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = None,
    category_id: int | None = None,
    storage_location_id: int | None = None,
    condition_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    sort_by: str = "id",
    sort_order: str = "desc",
    show_deleted: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(MuseumItem)
    if not show_deleted:
        q = q.filter(MuseumItem.is_deleted == False)
    if search:
        pattern = f"%{search}%"
        q = q.filter(or_(
            MuseumItem.name.ilike(pattern),
            MuseumItem.description.ilike(pattern),
            MuseumItem.notes.ilike(pattern),
            MuseumItem.inventory_number.ilike(pattern),
        ))
    if category_id:
        q = q.filter(MuseumItem.category_id == category_id)
    if storage_location_id:
        q = q.filter(MuseumItem.storage_location_id == storage_location_id)
    if condition_id:
        q = q.filter(MuseumItem.condition_id == condition_id)
    if date_from:
        q = q.filter(MuseumItem.acquisition_date >= date_from)
    if date_to:
        q = q.filter(MuseumItem.acquisition_date <= date_to)

    total = q.count()

    sort_col = getattr(MuseumItem, sort_by, MuseumItem.id)
    if sort_order == "asc":
        q = q.order_by(sort_col.asc())
    else:
        q = q.order_by(sort_col.desc())

    items = q.offset((page - 1) * per_page).limit(per_page).all()
    return ItemListResponse(items=items, total=total, page=page, per_page=per_page)


@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    data: ItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.keeper)),
):
    inv_number = _next_inventory_number(db)
    item = MuseumItem(
        inventory_number=inv_number,
        name=data.name,
        category_id=data.category_id,
        description=data.description,
        technique=data.technique,
        length=data.length,
        width=data.width,
        height=data.height,
        weight=data.weight,
        dating=data.dating,
        place_of_creation=data.place_of_creation,
        author=data.author,
        acquisition_method_id=data.acquisition_method_id,
        acquisition_source=data.acquisition_source,
        acquisition_date=data.acquisition_date,
        storage_location_id=data.storage_location_id,
        condition_id=data.condition_id,
        notes=data.notes,
        created_by=user.id,
    )
    db.add(item)
    db.flush()

    if data.material_ids:
        materials = db.query(Material).filter(Material.id.in_(data.material_ids)).all()
        item.materials = materials

    db.commit()
    db.refresh(item)
    log_action(db, user.id, "create", "item", item.id, f"Создан предмет: {item.name}")
    return item


@router.get("/{item_id}", response_model=ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(MuseumItem).filter(MuseumItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет не найден")
    return item


@router.put("/{item_id}", response_model=ItemResponse)
def update_item(
    item_id: int,
    data: ItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.keeper, UserRole.researcher)),
):
    item = db.query(MuseumItem).filter(MuseumItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет не найден")

    update_data = data.model_dump(exclude_unset=True)
    _track_changes(db, item, update_data, user.id)

    material_ids = update_data.pop("material_ids", None)
    for field, value in update_data.items():
        setattr(item, field, value)

    if material_ids is not None:
        materials = db.query(Material).filter(Material.id.in_(material_ids)).all()
        item.materials = materials

    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    log_action(db, user.id, "update", "item", item.id, f"Обновлён предмет: {item.name}")
    return item


@router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db), user: User = Depends(require_role(UserRole.admin, UserRole.keeper))):
    item = db.query(MuseumItem).filter(MuseumItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет не найден")
    item.is_deleted = True
    db.add(ItemHistory(
        item_id=item.id, user_id=user.id, field_name="is_deleted",
        old_value="false", new_value="true",
    ))
    db.commit()
    log_action(db, user.id, "delete", "item", item.id, f"Удалён предмет: {item.name}")
    return {"detail": "Предмет перемещён в архив"}


@router.post("/{item_id}/restore")
def restore_item(item_id: int, db: Session = Depends(get_db), user: User = Depends(require_role(UserRole.admin))):
    item = db.query(MuseumItem).filter(MuseumItem.id == item_id, MuseumItem.is_deleted == True).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет не найден в архиве")
    item.is_deleted = False
    db.add(ItemHistory(
        item_id=item.id, user_id=user.id, field_name="is_deleted",
        old_value="true", new_value="false",
    ))
    db.commit()
    log_action(db, user.id, "restore", "item", item.id, f"Восстановлен предмет: {item.name}")
    return {"detail": "Предмет восстановлен"}


@router.post("/{item_id}/images", response_model=dict)
def upload_image(
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.keeper, UserRole.researcher)),
):
    item = db.query(MuseumItem).filter(MuseumItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет не найден")

    current_count = db.query(ItemImage).filter(ItemImage.item_id == item_id).count()
    if current_count >= settings.MAX_IMAGES_PER_ITEM:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Максимум {settings.MAX_IMAGES_PER_ITEM} изображений")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Допустимые форматы: JPEG, PNG, WebP")

    content = file.file.read()
    if len(content) > settings.MAX_IMAGE_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Размер файла превышает 10 МБ")

    filename = f"{uuid.uuid4().hex}{ext}"
    item_dir = os.path.join(settings.UPLOAD_DIR, str(item_id))
    os.makedirs(item_dir, exist_ok=True)
    filepath = os.path.join(item_dir, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    image = ItemImage(item_id=item_id, file_path=f"/uploads/{item_id}/{filename}", original_name=file.filename or "image")
    db.add(image)
    db.commit()
    db.refresh(image)
    log_action(db, user.id, "upload_image", "item", item_id, f"Загружено изображение: {file.filename}")
    return {"id": image.id, "file_path": image.file_path}


@router.delete("/{item_id}/images/{image_id}")
def delete_image(
    item_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.keeper)),
):
    image = db.query(ItemImage).filter(ItemImage.id == image_id, ItemImage.item_id == item_id).first()
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Изображение не найдено")
    full_path = os.path.join(settings.UPLOAD_DIR, str(item_id), os.path.basename(image.file_path))
    if os.path.exists(full_path):
        os.remove(full_path)
    db.delete(image)
    db.commit()
    log_action(db, user.id, "delete_image", "item", item_id)
    return {"detail": "Изображение удалено"}


@router.get("/{item_id}/history", response_model=list[ItemHistoryResponse])
def get_history(item_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(ItemHistory).filter(ItemHistory.item_id == item_id).order_by(ItemHistory.changed_at.desc()).all()
