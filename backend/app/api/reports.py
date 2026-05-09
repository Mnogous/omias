import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
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
from app.models.dictionary import Category, Fond


def _require_non_guest(user: User = Depends(get_current_user)) -> User:
    if user.role == UserRole.guest:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Гостевая роль не имеет доступа к отчётам")
    return user

router = APIRouter(prefix="/reports", tags=["Отчёты"])


def _fmt_date(d) -> str:
    return d.strftime("%d-%m-%Y") if d else ""


def _fmt_size(item: MuseumItem) -> str:
    parts = []
    if item.length:
        parts.append(f"Д {item.length}")
    if item.width:
        parts.append(f"Ш {item.width}")
    if item.height:
        parts.append(f"В {item.height}")
    if item.depth:
        parts.append(f"Гл {item.depth}")
    size = " × ".join(parts)
    if size:
        size += " мм"
    if item.weight:
        size = f"{size}; {item.weight} г" if size else f"{item.weight} г"
    return size


def _para_multiline(text: str | None, style) -> Paragraph:
    if not text:
        return Paragraph("—", style)
    safe = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")
    return Paragraph(safe, style)


def _register_fonts():
    try:
        pdfmetrics.getFont("DejaVuSans")
        return
    except KeyError:
        pass

    import os
    bundled_dir = os.path.join(os.path.dirname(__file__), "..", "..", "fonts")
    bundled_regular = os.path.join(bundled_dir, "DejaVuSans.ttf")
    bundled_bold = os.path.join(bundled_dir, "DejaVuSans-Bold.ttf")
    if os.path.exists(bundled_regular):
        pdfmetrics.registerFont(TTFont("DejaVuSans", bundled_regular))
        if os.path.exists(bundled_bold):
            pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", bundled_bold))
        return

    win_fonts = os.environ.get("WINDIR", r"C:\Windows") + r"\Fonts"
    arial_regular = os.path.join(win_fonts, "arial.ttf")
    arial_bold = os.path.join(win_fonts, "arialbd.ttf")
    if os.path.exists(arial_regular):
        pdfmetrics.registerFont(TTFont("DejaVuSans", arial_regular))
        if os.path.exists(arial_bold):
            pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", arial_bold))


def _get_styles():
    _register_fonts()
    styles = getSampleStyleSheet()
    try:
        pdfmetrics.getFont("DejaVuSans")
        font_name = "DejaVuSans"
    except KeyError:
        font_name = "Helvetica"

    styles.add(ParagraphStyle(name="RuTitle", fontName=font_name, fontSize=16, alignment=1, spaceAfter=12))
    styles.add(ParagraphStyle(name="RuSubtitle", fontName=font_name, fontSize=11, alignment=1, spaceAfter=10))
    styles.add(ParagraphStyle(name="RuNormal", fontName=font_name, fontSize=10, leading=14))
    styles.add(ParagraphStyle(name="RuCell", fontName=font_name, fontSize=8, leading=10))
    styles.add(ParagraphStyle(name="RuCellSmall", fontName=font_name, fontSize=7, leading=9))
    return styles, font_name


@router.get("/inventory-book")
def inventory_book(
    category_id: int | None = None,
    condition_id: int | None = None,
    fond_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(_require_non_guest),
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
    if condition_id:
        q = q.filter(MuseumItem.condition_id == condition_id)
    if fond_id:
        q = q.filter(MuseumItem.fond_id == fond_id)
    items = q.order_by(MuseumItem.inventory_number).all()

    data = [["№", "Инв. номер", "№ в фонде", "Наименование", "Категория", "Дата пост.", "Место хран.", "Размещение"]]
    for i, item in enumerate(items, 1):
        data.append([
            str(i),
            Paragraph(item.inventory_number, styles["RuCell"]),
            Paragraph(item.fond_number or "—", styles["RuCell"]),
            Paragraph(item.name[:80], styles["RuCell"]),
            Paragraph(item.category.name if item.category else "—", styles["RuCell"]),
            _fmt_date(item.acquisition_date) or "—",
            Paragraph(item.storage_place.name if item.storage_place else "—", styles["RuCell"]),
            Paragraph(item.storage_location or "—", styles["RuCell"]),
        ])

    table = Table(data, colWidths=[8*mm, 25*mm, 22*mm, 42*mm, 22*mm, 20*mm, 24*mm, 24*mm])
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


@router.get("/acquisitions-book")
def acquisitions_book(
    fond_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(_require_non_guest),
):
    styles, font_name = _get_styles()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=10*mm, rightMargin=10*mm, topMargin=15*mm, bottomMargin=15*mm,
    )
    elements = []

    title = "Книга поступлений фондов музея"
    if fond_id:
        fond = db.query(Fond).filter(Fond.id == fond_id).first()
        if fond:
            title = f"Книга поступлений: {fond.name}"
    elements.append(Paragraph(title, styles["RuTitle"]))
    elements.append(Paragraph("(главная инвентарная книга музея)", styles["RuSubtitle"]))
    elements.append(Spacer(1, 4*mm))

    q = db.query(MuseumItem).filter(MuseumItem.is_deleted == False)
    if fond_id:
        q = q.filter(MuseumItem.fond_id == fond_id)
    items = q.order_by(MuseumItem.acquisition_date.asc().nulls_last(), MuseumItem.id.asc()).all()

    header = [
        "№\nп/п",
        "Дата\nрегист-\nрации",
        "Наименование, краткое описание визуальных характеристик музейного предмета. Сведения в том числе об авторе, школе, времени и месте создания, производства, находки",
        "Количество музейных предметов",
        "Материал,\nтехника\nизготовления",
        "Размер",
        "Состояние\nсохранности",
        "Источник и форма поступления в том числе закупка, дарение, пожертвование, завещание",
        "№ и дата\nакта ПХ",
        "Название и шифр фондовой коллекции, в которую включается музейный предмет. №№ по инвентарной книге, специальной инвентарной книге",
        "Примеча-\nние",
    ]
    data = [[Paragraph(h, styles["RuCellSmall"]) for h in header]]
    data.append([Paragraph(str(n), styles["RuCellSmall"]) for n in range(1, 12)])

    for i, item in enumerate(items, 1):
        descr_parts = [item.name]
        if item.description:
            descr_parts.append(item.description)
        meta = []
        if item.author:
            meta.append(f"Автор: {item.author}")
        if item.dating:
            meta.append(f"Датировка: {item.dating}")
        if item.place_of_creation:
            meta.append(f"Место создания: {item.place_of_creation}")
        if meta:
            descr_parts.append(". ".join(meta))
        descr = "\n".join(descr_parts)

        materials = " / ".join(m.name for m in item.materials) if item.materials else ""
        technique = item.technique or ""
        material_technique = "\n".join(p for p in [materials, technique] if p) or "—"

        source_parts = []
        if item.acquisition_method:
            source_parts.append(item.acquisition_method.name)
        if item.acquisition_source:
            source_parts.append(item.acquisition_source)
        source = ". ".join(source_parts) or "—"

        fond_label = item.fond.name if item.fond else "—"
        fond_full = f"{fond_label}\n№ {item.fond_number or '—'}\nИнв. {item.inventory_number}"

        data.append([
            Paragraph(str(i), styles["RuCellSmall"]),
            Paragraph(_fmt_date(item.acquisition_date) or "—", styles["RuCellSmall"]),
            _para_multiline(descr, styles["RuCellSmall"]),
            Paragraph(str(item.quantity or 1), styles["RuCellSmall"]),
            _para_multiline(material_technique, styles["RuCellSmall"]),
            Paragraph(_fmt_size(item) or "—", styles["RuCellSmall"]),
            Paragraph(item.condition.name if item.condition else "—", styles["RuCellSmall"]),
            _para_multiline(source, styles["RuCellSmall"]),
            Paragraph("", styles["RuCellSmall"]),
            _para_multiline(fond_full, styles["RuCellSmall"]),
            _para_multiline(item.notes, styles["RuCellSmall"]),
        ])

    col_widths = [8*mm, 20*mm, 50*mm, 14*mm, 28*mm, 22*mm, 22*mm, 35*mm, 22*mm, 38*mm, 18*mm]
    table = Table(data, colWidths=col_widths, repeatRows=2)
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e0e0e0")),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#f5f5f5")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (0, 0), (-1, 1), "CENTER"),
    ]))
    elements.append(table)

    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=acquisitions_book.pdf"},
    )


@router.get("/item-card/{item_id}")
def item_card(item_id: int, db: Session = Depends(get_db), user: User = Depends(_require_non_guest)):
    styles, font_name = _get_styles()
    item = db.query(MuseumItem).filter(MuseumItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Предмет не найден")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=20*mm, rightMargin=15*mm, topMargin=20*mm, bottomMargin=20*mm)
    elements = []

    elements.append(Paragraph("КАРТОЧКА МУЗЕЙНОГО ПРЕДМЕТА", styles["RuTitle"]))
    elements.append(Spacer(1, 6*mm))

    fields = [
        ("Инвентарный номер", item.inventory_number),
        ("Фонд", item.fond.name if item.fond else "—"),
        ("№ в фонде", item.fond_number or "—"),
        ("Наименование", item.name),
        ("Количество", str(item.quantity or 1)),
        ("Категория", item.category.name if item.category else "—"),
        ("Описание", item.description),
        ("Материал", ", ".join(m.name for m in item.materials) if item.materials else "—"),
        ("Техника", item.technique or "—"),
        ("Размеры (Д×Ш×В×Гл)", f"{item.length or '—'} × {item.width or '—'} × {item.height or '—'} × {item.depth or '—'} мм"),
        ("Масса", f"{item.weight} г" if item.weight else "—"),
        ("Датировка", item.dating or "—"),
        ("Место создания", item.place_of_creation or "—"),
        ("Автор", item.author or "—"),
        ("Способ поступления", item.acquisition_method.name if item.acquisition_method else "—"),
        ("Источник поступления", item.acquisition_source or "—"),
        ("Дата поступления", _fmt_date(item.acquisition_date) or "—"),
        ("Место хранения", item.storage_place.name if item.storage_place else "—"),
        ("Место размещения", item.storage_location or "—"),
        ("Сохранность", item.condition.name if item.condition else "—"),
        ("Расшифровка состояния", item.condition_notes or "—"),
        ("Примечания", item.notes),
    ]

    data = [[Paragraph(label, styles["RuCell"]), _para_multiline(value if isinstance(value, str) else str(value or "—"), styles["RuCell"])] for label, value in fields]
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
    from datetime import datetime, timedelta, timezone
    from app.models.user import User as UserModel, UserRole
    from app.models.audit import AuditLog

    total = db.query(func.count(MuseumItem.id)).filter(MuseumItem.is_deleted == False).scalar()
    by_category = (
        db.query(Category.name, func.count(MuseumItem.id))
        .join(MuseumItem, MuseumItem.category_id == Category.id)
        .filter(MuseumItem.is_deleted == False)
        .group_by(Category.name)
        .all()
    )

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_items_count = db.query(func.count(MuseumItem.id)).filter(
        MuseumItem.is_deleted == False,
        MuseumItem.created_at >= week_ago,
    ).scalar()

    result = {
        "total_items": total,
        "by_category": [{"category": name, "count": cnt} for name, cnt in by_category],
        "recent_items_count": recent_items_count,
    }

    if user.role == UserRole.admin:
        result["total_users"] = db.query(func.count(UserModel.id)).scalar()
        recent_actions = (
            db.query(AuditLog)
            .join(UserModel, AuditLog.user_id == UserModel.id)
            .order_by(AuditLog.created_at.desc())
            .limit(10)
            .all()
        )
        result["recent_actions"] = [
            {
                "id": a.id,
                "user": a.user.full_name if a.user else "—",
                "action": a.action,
                "details": a.details,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in recent_actions
        ]

    return result


@router.get("/acquisitions")
def acquisitions_report(
    date_from: date,
    date_to: date,
    db: Session = Depends(get_db),
    user: User = Depends(_require_non_guest),
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
            "acquisition_date": _fmt_date(item.acquisition_date),
            "acquisition_source": item.acquisition_source,
        }
        for item in items
    ]


@router.get("/export-csv")
def export_csv(
    category_id: int | None = None,
    condition_id: int | None = None,
    fond_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(_require_non_guest),
):
    q = db.query(MuseumItem).filter(MuseumItem.is_deleted == False)
    if category_id:
        q = q.filter(MuseumItem.category_id == category_id)
    if condition_id:
        q = q.filter(MuseumItem.condition_id == condition_id)
    if fond_id:
        q = q.filter(MuseumItem.fond_id == fond_id)
    items = q.order_by(MuseumItem.inventory_number).all()

    output = io.StringIO()
    output.write("sep=;\n")
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_ALL, lineterminator="\r\n")
    writer.writerow([
        "Инв. номер", "Фонд", "№ в фонде", "Наименование", "Количество", "Категория",
        "Описание", "Материал", "Датировка",
        "Место хранения", "Место размещения",
        "Сохранность", "Дата поступления",
    ])
    for item in items:
        writer.writerow([
            item.inventory_number,
            item.fond.name if item.fond else "",
            item.fond_number or "",
            item.name,
            item.quantity or 1,
            item.category.name if item.category else "",
            (item.description or "").replace("\r\n", "\n"),
            " / ".join(m.name for m in item.materials),
            item.dating or "",
            item.storage_place.name if item.storage_place else "",
            item.storage_location or "",
            item.condition.name if item.condition else "",
            _fmt_date(item.acquisition_date),
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("cp1251")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=export.csv"},
    )
