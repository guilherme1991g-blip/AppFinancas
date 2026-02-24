from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SonhoCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_amount: float
    current_amount: float = 0.0
    deadline: Optional[datetime] = None
    color: Optional[str] = "#6366F1"
    icon: Optional[str] = "star"


class SonhoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    deadline: Optional[datetime] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class SonhoResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str]
    target_amount: float
    current_amount: float
    deadline: Optional[datetime]
    color: str
    icon: str
    created_at: datetime
    updated_at: datetime
