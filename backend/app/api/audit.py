from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import require_role
from app.models.user import User, UserRole
from app.models.audit import AuditLog

router = APIRouter(prefix="/audit", tags=["Журнал действий"])


@router.get("/")
def list_audit(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    user_id: int | None = None,
    action: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
):
    q = db.query(AuditLog).options(joinedload(AuditLog.user))
    if user_id is not None:
        q = q.filter(AuditLog.user_id == user_id)
    if action is not None:
        q = q.filter(AuditLog.action == action)
    if date_from:
        q = q.filter(AuditLog.created_at >= datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc))
    if date_to:
        next_day = date_to + timedelta(days=1)
        q = q.filter(AuditLog.created_at < datetime(next_day.year, next_day.month, next_day.day, tzinfo=timezone.utc))

    total = q.count()
    entries = q.order_by(AuditLog.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {
        "entries": [
            {
                "id": e.id,
                "user": {"id": e.user.id, "username": e.user.username, "full_name": e.user.full_name} if e.user else None,
                "action": e.action,
                "entity_type": e.entity_type,
                "entity_id": e.entity_id,
                "details": e.details,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }
