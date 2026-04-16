from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services.audit import log_action

router = APIRouter(prefix="/users", tags=["Пользователи"])


@router.get("/", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db), user: User = Depends(require_role(UserRole.admin))):
    return db.query(User).order_by(User.id).all()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: Session = Depends(get_db), user: User = Depends(require_role(UserRole.admin))):
    if db.query(User).filter((User.username == data.username) | (User.email == data.email)).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Логин или email уже используется")
    new_user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        email=data.email,
        role=data.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    log_action(db, user.id, "create", "user", new_user.id, f"Создан пользователь {new_user.username}")
    return new_user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db), user: User = Depends(require_role(UserRole.admin))):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    return target


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), user: User = Depends(require_role(UserRole.admin))):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(target, field, value)
    db.commit()
    db.refresh(target)
    log_action(db, user.id, "update", "user", target.id, f"Обновлён пользователь {target.username}")
    return target


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), user: User = Depends(require_role(UserRole.admin))):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    if target.id == user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя удалить свою учётную запись")
    db.delete(target)
    db.commit()
    log_action(db, user.id, "delete", "user", user_id, f"Удалён пользователь {target.username}")
    return {"detail": "Пользователь удалён"}
