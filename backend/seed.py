from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.dictionary import Category, Material, StorageLocation, Condition, AcquisitionMethod
from app.models.settings import SystemSetting

db = SessionLocal()

if not db.query(User).first():
    admin = User(
        username="admin",
        password_hash=hash_password("admin123A"),
        full_name="Администратор системы",
        email="admin@omias.local",
        role=UserRole.admin,
    )
    keeper = User(
        username="keeper",
        password_hash=hash_password("keeper123A"),
        full_name="Хранитель фондов",
        email="keeper@omias.local",
        role=UserRole.keeper,
    )
    researcher = User(
        username="researcher",
        password_hash=hash_password("research123A"),
        full_name="Научный сотрудник",
        email="researcher@omias.local",
        role=UserRole.researcher,
    )
    guest = User(
        username="guest",
        password_hash=hash_password("guest123A"),
        full_name="Гость",
        email="guest@omias.local",
        role=UserRole.guest,
    )
    db.add_all([admin, keeper, researcher, guest])

categories = [
    "Документы", "Фотографии", "Форменная одежда", "Технические средства",
    "Награды и знаки отличия", "Печатные издания", "Предметы быта",
    "Средства связи", "Транспортные средства", "Прочее",
]
for name in categories:
    if not db.query(Category).filter(Category.name == name).first():
        db.add(Category(name=name))

materials_list = [
    "Бумага", "Металл", "Дерево", "Ткань", "Кожа", "Пластик",
    "Стекло", "Керамика", "Резина", "Картон",
]
for name in materials_list:
    if not db.query(Material).filter(Material.name == name).first():
        db.add(Material(name=name))

locations = [
    "Основное хранилище", "Выставочный зал №1", "Выставочный зал №2",
    "Реставрационная мастерская", "Временное хранение",
]
for name in locations:
    if not db.query(StorageLocation).filter(StorageLocation.name == name).first():
        db.add(StorageLocation(name=name))

conditions_list = [
    "Отличное", "Хорошее", "Удовлетворительное",
    "Требует реставрации", "Неудовлетворительное",
]
for name in conditions_list:
    if not db.query(Condition).filter(Condition.name == name).first():
        db.add(Condition(name=name))

methods = [
    "Дарение", "Покупка", "Передача из ведомства",
    "Экспедиция", "Обмен", "Находка",
]
for name in methods:
    if not db.query(AcquisitionMethod).filter(AcquisitionMethod.name == name).first():
        db.add(AcquisitionMethod(name=name))

if not db.query(SystemSetting).filter(SystemSetting.key == "inventory_template").first():
    db.add(SystemSetting(key="inventory_template", value="МГ-{number:06d}"))

db.commit()
db.close()
print("Seed data created successfully")
