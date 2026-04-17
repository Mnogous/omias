from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.dictionary import Category, Material, StorageLocation, Condition, AcquisitionMethod
from app.schemas.dictionary import DictionaryCreate, DictionaryResponse
from app.services.audit import log_action

router = APIRouter(prefix="/dictionaries", tags=["Справочники"])

DICT_MAP = {
    "categories": Category,
    "materials": Material,
    "storage_locations": StorageLocation,
    "conditions": Condition,
    "acquisition_methods": AcquisitionMethod,
}

DICT_NAMES = {
    "categories": "Категории",
    "materials": "Материалы",
    "storage_locations": "Места хранения",
    "conditions": "Состояния сохранности",
    "acquisition_methods": "Способы поступления",
}


@router.get("/{dict_type}", response_model=list[DictionaryResponse])
def list_dict(dict_type: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    model = DICT_MAP.get(dict_type)
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Справочник не найден")
    return db.query(model).order_by(model.name).all()


@router.post("/{dict_type}", response_model=DictionaryResponse, status_code=status.HTTP_201_CREATED)
def create_dict(dict_type: str, data: DictionaryCreate, db: Session = Depends(get_db), user: User = Depends(require_role(UserRole.admin))):
    model = DICT_MAP.get(dict_type)
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Справочник не найден")
    if db.query(model).filter(model.name == data.name).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Значение уже существует")
    entry = model(name=data.name)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    log_action(db, user.id, "create", dict_type, entry.id, f"Добавлено: {data.name}")
    return entry


@router.put("/{dict_type}/{entry_id}", response_model=DictionaryResponse)
def update_dict(dict_type: str, entry_id: int, data: DictionaryCreate, db: Session = Depends(get_db), user: User = Depends(require_role(UserRole.admin))):
    model = DICT_MAP.get(dict_type)
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Справочник не найден")
    entry = db.query(model).filter(model.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Запись не найдена")
    entry.name = data.name
    db.commit()
    db.refresh(entry)
    log_action(db, user.id, "update", dict_type, entry.id, f"Изменено на: {data.name}")
    return entry


@router.delete("/{dict_type}/{entry_id}")
def delete_dict(dict_type: str, entry_id: int, db: Session = Depends(get_db), user: User = Depends(require_role(UserRole.admin))):
    model = DICT_MAP.get(dict_type)
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Справочник не найден")
    entry = db.query(model).filter(model.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Запись не найдена")
    try:
        db.delete(entry)
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Невозможно удалить «{entry.name}»: существуют связанные предметы"
        )
    db.commit()
    log_action(db, user.id, "delete", dict_type, entry_id, f"Удалено: {entry.name}")
    return {"detail": "Удалено"}
