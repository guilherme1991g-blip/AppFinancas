from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class BillStatus(str, Enum):
    open = "open"
    closed = "closed"
    paid = "paid"
    overdue = "overdue"

class BillResponse(BaseModel):
    id: str
    account_id: str
    month: int
    year: int
    amount: float
    status: BillStatus
    due_date: datetime
    closing_date: datetime
    transactions: List[dict] = []
    created_at: datetime
