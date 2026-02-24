from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MetaCreate(BaseModel):
    category_id: str
    amount: float
    month: int  # 1-12
    year: int
    company_id: Optional[str] = None


class MetaUpdate(BaseModel):
    amount: Optional[float] = None


class MetaResponse(BaseModel):
    id: str
    user_id: str
    category_id: str
    amount: float
    month: int
    year: int
    spent: float = 0.0
    company_id: Optional[str]
    created_at: datetime
