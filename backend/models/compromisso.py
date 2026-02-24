from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CompromissoCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: datetime
    location: Optional[str] = None
    reminder: bool = True


class CompromissoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    location: Optional[str] = None
    reminder: Optional[bool] = None


class CompromissoResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str]
    date: datetime
    location: Optional[str]
    reminder: bool
    created_at: datetime
    updated_at: datetime
