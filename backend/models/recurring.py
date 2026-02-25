from pydantic import BaseModel
from typing import Optional
from enum import Enum
from datetime import datetime


class RecurrenceFrequency(str, Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"


class RecurringCreate(BaseModel):
    account_id: str
    category_id: str
    type: str  # income | expense
    amount: float
    description: str
    frequency: RecurrenceFrequency
    start_date: datetime
    end_date: Optional[datetime] = None
    day_of_month: Optional[int] = None
    company_id: Optional[str] = None
    installments: Optional[int] = None  # null means unlimited


class RecurringUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None


class RecurringResponse(BaseModel):
    id: str
    user_id: str
    account_id: str
    category_id: str
    type: str
    amount: float
    description: str
    frequency: RecurrenceFrequency
    start_date: datetime
    end_date: Optional[datetime]
    day_of_month: Optional[int]
    is_active: bool
    company_id: Optional[str]
    installments: Optional[int]
    created_at: datetime
