import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.item import MuseumItem
from app.models.dictionary import Category

router = APIRouter(prefix="/reports", tags=["Отчёты"])


def _register_fonts():
    try:
        pdfmetrics.getFont("DejaVuSans")
    except KeyError:
        import os
        font_path = os.path.join(os.path.dirname(__file__), "..", "..", "fonts", "DejaVuSans.ttf")
        if os.path.exists(font_path):
            pdfmetrics.registerFont(TTFont("DejaVuSans", font_path))
            pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", os.path.join(os.path.dirname(font_path), "DejaVuSans-Bold.ttf")))


def _get_styles():
    _register_fonts()
    styles = getSampleStyleSheet()
    try:
        pdfmetrics.getFont("DejaVuSans")
        font_name = "DejaVuSans"
    except KeyError:
        font_name = "Helvetica"

    styles.add(ParagraphStyle(name="RuTitle", fontName=font_name, fontSize=16, alignment=1, spaceAfter=12))
    styles.add(ParagraphStyle(name="RuNormal", fontName=font_name, fontSize=10, leading=14))
    styles.add(ParagraphStyle(name="RuCell", fontName=font_name, fontSize=8, leading=10))
    return styles, font_name


@router.get("/inventory-book")
def inventory_book(
    category_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.keeper, UserRole.researcher)),
):
    styles, font_name = _get_styles()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=20*mm, rightMargin=15*mm, topMargin=20*mm, bottomMargin=20*mm)
    elements = []

    elements.append(Paragraph("ИНВЕНТАРНАЯ КНИГА", styles["RuTitle"]))
    elements.append(Spacer(1, 6*mm))

    q = db.query(MuseumItem).filter(MuseumItem.is_deleted == False)
    if category_id:
        q = q.filter(MuseumItem.category_id == category_id)
    items = q.order_by(MuseumItem.inventory_number).all()

    data = [["№", "Инв. номер", "Наименование", "Категория", "Дата пост.", "Место хр."]]
    for i, item in enumerate(items, 1):
        data.append([
            str(i),
            Paragraph(item.inventory_number, styles["RuCell"]),
            Paragraph(item.name[:80], styles["RuCell"]),
            Paragraph(item.category.name if item.category else "-", styles["RuCell"]),
            str(item.acquisition_date or "-"),
            Paragraph(item.storage_location.name if item.storage_location else "-", styles["RuCell"]),
        ])

    table = Table(data, colWidths=[10*mm, 30*mm, 55*mm, 30*mm, 22*mm, 30*mm])
    table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), font_name),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e0e0e0")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    elements.append(table)

    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=inventory_book.pdf"})


@router.get("/item-card/{item_id}")
def item_card(item_id: int, db: Session = Depends(get_db), user: User = Depends(require_role(UserRole.admin, UserRole.keeper, UserRole.researcher))):
    styles, font_name = _get_styles()
    item = db.query(MuseumItem).filter(MuseumItem.id == item_id).first()
    if not item:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Предмет не найден")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=20*mm, rightMargin=15*mm, topMargin=20*mm, bottomMargin=20*mm)
    elements = []

    elements.append(Paragraph("КАРТОЧКА МУЗЕЙНОГО ПРЕДМЕТА", styles["RuTitle"]))
    elements.append(Spacer(1, 6*mm))

    fields = [
        ("Инвентарный номер", item.inventory_number),
        ("Наименование", item.name),
        ("Категория", item.category.name if item.category else "-"),
        ("Описание", item.description or "-"),
        ("Материал", ", ".join(m.name for m in item.materials) if item.materials else "-"),
        ("Техника", item.technique or "-"),
        ("Размеры (Д×Ш×В)", f"{item.length or '-'} × {item.width or '-'} × {item.height or '-'} мм"),
        ("Масса", f"{item.weight} г" if item.weight else "-"),
        ("Датировка", item.dating or "-"),
        ("Место создания", item.place_of_creation or "-"),
        ("Автор", item.author or "-"),
        ("Способ поступления", item.acquisition_method.name if item.acquisition_method else "-"),
        ("Источник поступления", item.acquisition_source or "-"),
        ("Дата поступления", str(item.acquisition_date) if item.acquisition_date else "-"),
        ("Место хранения", item.storage_location.name if item.storage_location else "-"),
        ("Сохранность", item.condition.name if item.condition else "-"),
        ("Примечания", item.notes or "-"),
    ]

    data = [[Paragraph(f[0], styles["RuCell"]), Paragraph(str(f[1])[:500], styles["RuCell"])] for f in fields]
    table = Table(data, colWidths=[50*mm, 120*mm])
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f0f0f0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    elements.append(table)

    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=item_{item_id}.pdf"})


@router.get("/statistics")
def statistics(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    total = db.query(func.count(MuseumItem.id)).filter(MuseumItem.is_deleted == False).scalar()
    by_category = (
        db.query(Category.name, func.count(MuseumItem.id))
        .join(MuseumItem, MuseumItem.category_id == Category.id)
        .filter(MuseumItem.is_deleted == False)
        .group_by(Category.name)
        .all()
    )
    return {
        "total_items": total,
        "by_category": [{"category": name, "count": cnt} for name, cnt in by_category],
    }


@router.get("/acquisitions")
def acquisitions_report(
    date_from: date,
    date_to: date,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.keeper, UserRole.researcher)),
):
    items = (
        db.query(MuseumItem)
        .filter(MuseumItem.is_deleted == False, MuseumItem.acquisition_date >= date_from, MuseumItem.acquisition_date <= date_to)
        .order_by(MuseumItem.acquisition_date)
        .all()
    )
    return [
        {
            "id": item.id,
            "inventory_number": item.inventory_number,
            "name": item.name,
            "acquisition_date": str(item.acquisition_date),
            "acquisition_source": item.acquisition_source,
        }
        for item in items
    ]


@router.get("/export-csv")
def export_csv(
    category_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.keeper, UserRole.researcher)),
):
    q = db.query(MuseumItem).filter(MuseumItem.is_deleted == False)
    if category_id:
        q = q.filter(MuseumItem.category_id == category_id)
    items = q.order_by(MuseumItem.inventory_number).all()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow(["Инв. номер", "Наименование", "Категория", "Описание", "Материал", "Датировка", "Место хранения", "Сохранность", "Дата поступления"])
    for item in items:
        writer.writerow([
            item.inventory_number,
            item.name,
            item.category.name if item.category else "",
            (item.description or "")[:200],
            ", ".join(m.name for m in item.materials),
            item.dating or "",
            item.storage_location.name if item.storage_location else "",
            item.condition.name if item.condition else "",
            str(item.acquisition_date) if item.acquisition_date else "",
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=export.csv"},
    )
