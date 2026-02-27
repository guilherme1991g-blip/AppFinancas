from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TransferCreate(BaseModel):
    from_account_id: str
    to_account_id: Optional[str] = None
    to_sonho_id: Optional[str] = None
    amount: float
    description: str
    date: datetime
    notes: str = ""


class TransferResponse(BaseModel):
    id: str
    user_id: str
    from_account_id: str
    to_account_id: Optional[str] = None
    to_sonho_id: Optional[str] = None
    amount: float
    description: str
    date: datetime
    notes: str
    created_at: datetime
