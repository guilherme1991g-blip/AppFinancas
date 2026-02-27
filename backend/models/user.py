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


class DashboardCard(BaseModel):
    id: str
    enabled: bool = True
    order: int


def _get_default_dashboard_cards():
    return [
        DashboardCard(id="balance", enabled=True, order=0),
        DashboardCard(id="summary", enabled=True, order=1),
        DashboardCard(id="cards", enabled=True, order=2),
        DashboardCard(id="overdue_bills", enabled=True, order=3),
        DashboardCard(id="upcoming_bills", enabled=True, order=4),
        DashboardCard(id="transactions", enabled=True, order=5),
        DashboardCard(id="goals", enabled=True, order=6),
        DashboardCard(id="spending_categories", enabled=False, order=7),
        DashboardCard(id="budget_progress", enabled=False, order=8),
    ]

def get_default_dashboard_cards():
    return _get_default_dashboard_cards()


class UserPreferences(BaseModel):
    """Unified preferences model: notifications + display + security settings."""
    notifications: NotificationPreferences = Field(default_factory=NotificationPreferences)
    security: SecurityPreferences = Field(default_factory=SecurityPreferences)
    language: str = "pt-BR"
    currency: str = "BRL"
    theme: str = "light"
    whatsapp_enabled: bool = False
    dashboard_cards: list[DashboardCard] = Field(default_factory=get_default_dashboard_cards)


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
