from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


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


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime
    preferences: Optional[NotificationPreferences] = Field(default_factory=NotificationPreferences)
    push_token: Optional[str] = None
