from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    cpf: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class NotificationPreferences(BaseModel):
    bill_reminders: bool = True
    budget_alerts: bool = True
    daily_summary: bool = False
    recurring_alerts: bool = True
    whatsapp_transactions: bool = False
    overdue_bills: bool = True
    due_today_bills: bool = True
    agenda_reminders: bool = True


class SecurityPreferences(BaseModel):
    biometric_enabled: bool = False
    multi_device: bool = True


class UserPreferences(BaseModel):
    """Unified preferences model: notifications + display + security settings."""
    notifications: NotificationPreferences = Field(default_factory=NotificationPreferences)
    security: SecurityPreferences = Field(default_factory=SecurityPreferences)
    language: str = "pt-BR"
    currency: str = "BRL"
    theme: str = "light"
    whatsapp_enabled: bool = False


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    cpf: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    cpf: Optional[str] = None
    created_at: datetime
    preferences: Optional[UserPreferences] = Field(default_factory=UserPreferences)
    push_token: Optional[str] = None
