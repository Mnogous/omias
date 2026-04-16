# ОМИАС — Открытая музейная информационная автоматизированная система

В postgresql:
```
CREATE DATABASE omias;
```

backend:
```
# Создать виртуальное окружение
python -m venv venv

# Активировать его (Windows)
venv\Scripts\activate

# Установить зависимости
pip install -r requirements.txt

# Применить миграции (создать таблицы в БД)
alembic upgrade head

# Заполнить справочники и пользователей
python seed.py

# Запустить сервер
uvicorn app.main:app --reload
```

front-end:
```
npm run dev
```
