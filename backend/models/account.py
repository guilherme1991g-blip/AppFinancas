from pydantic import BaseModel
from typing import Optional
from enum import Enum


class AccountType(str, Enum):
    checking = "checking"
    savings = "savings"
    credit_card = "credit_card"
    wallet = "wallet"
    investment = "investment"


class AccountCreate(BaseModel):
    name: str
    type: AccountType
    bank: Optional[str] = None
    balance: float = 0.0
    color: Optional[str] = "#00D09C"
    icon: Optional[str] = "wallet"
    company_id: Optional[str] = None


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    bank: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class AccountResponse(BaseModel):
    id: str
    user_id: str
    name: str
    type: AccountType
    bank: Optional[str]
    balance: float
    color: str
    icon: str
    company_id: Optional[str]
