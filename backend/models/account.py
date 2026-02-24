from pydantic import BaseModel
from typing import Optional
from enum import Enum


class AccountType(str, Enum):
    checking = "checking"
    savings = "savings"
    credit_card = "credit_card"
    wallet = "wallet"
    investment = "investment"


class CardBrand(str, Enum):
    visa = "visa"
    mastercard = "mastercard"
    elo = "elo"
    amex = "amex"
    hipercard = "hipercard"
    other = "other"


class AccountCreate(BaseModel):
    name: str
    type: AccountType
    bank: Optional[str] = None
    balance: float = 0.0
    color: Optional[str] = "#00D09C"
    icon: Optional[str] = "wallet"
    company_id: Optional[str] = None
    # Credit card specific fields
    credit_limit: Optional[float] = None
    closing_day: Optional[int] = None   # day of month billing closes
    due_day: Optional[int] = None       # day of month payment is due
    last_digits: Optional[str] = None   # last 4 digits
    card_brand: Optional[CardBrand] = None
    card_holder: Optional[str] = None


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    bank: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    credit_limit: Optional[float] = None
    closing_day: Optional[int] = None
    due_day: Optional[int] = None
    last_digits: Optional[str] = None
    card_brand: Optional[str] = None
    card_holder: Optional[str] = None


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
    # Credit card fields
    credit_limit: Optional[float] = None
    closing_day: Optional[int] = None
    due_day: Optional[int] = None
    last_digits: Optional[str] = None
    card_brand: Optional[str] = None
    card_holder: Optional[str] = None
