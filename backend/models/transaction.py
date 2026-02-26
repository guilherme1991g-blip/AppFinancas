from pydantic import BaseModel
from typing import Optional
from enum import Enum
from datetime import datetime


class TransactionType(str, Enum):
    income = "income"
    expense = "expense"


class TransactionCreate(BaseModel):
    account_id: str
    category_id: str
    type: TransactionType
    amount: float
    description: str
    date: datetime
    notes: Optional[str] = None
    tags: Optional[list[str]] = []
    company_id: Optional[str] = None
    recurring_id: Optional[str] = None
    is_paid: bool = True
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None


class TransactionUpdate(BaseModel):
    category_id: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    notes: Optional[str] = None
    tags: Optional[list[str]] = None


class TransactionResponse(BaseModel):
    id: str
    user_id: str
    account_id: str
    category_id: str
    type: TransactionType
    amount: float
    description: str
    date: datetime
    notes: Optional[str]
    tags: list[str]
    company_id: Optional[str]
    is_paid: bool
    due_date: Optional[datetime]
    paid_at: Optional[datetime]
    created_at: datetime


class TransactionPaymentRequest(BaseModel):
    date: Optional[datetime] = None


class BillPaymentRequest(BaseModel):
    payment_account_id: str
    amount: Optional[float] = None
    date: Optional[datetime] = None
