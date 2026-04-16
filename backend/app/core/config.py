import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/omias"
    SECRET_KEY: str = "omias-secret-key-change-in-production-2025"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    MAX_IMAGE_SIZE: int = 10 * 1024 * 1024
    MAX_IMAGES_PER_ITEM: int = 20
    INVENTORY_NUMBER_TEMPLATE: str = "МГ-{number:06d}"

    class Config:
        env_file = ".env"


settings = Settings()
