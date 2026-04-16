from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator

from app.models.user import UserRole


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    email: str
    role: UserRole = UserRole.guest

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Пароль должен содержать не менее 8 символов")
        has_letter = any(c.isalpha() for c in v)
        has_digit = any(c.isdigit() for c in v)
        if not has_letter or not has_digit:
            raise ValueError("Пароль должен содержать буквы и цифры")
        return v


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ChangePassword(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Пароль должен содержать не менее 8 символов")
        has_letter = any(c.isalpha() for c in v)
        has_digit = any(c.isdigit() for c in v)
        if not has_letter or not has_digit:
            raise ValueError("Пароль должен содержать буквы и цифры")
        return v
