from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CompanyCreate(BaseModel):
    name: str
    cnpj: Optional[str] = None
    description: Optional[str] = None
    color: str = "#6C5ECF"


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    cnpj: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class CompanyResponse(BaseModel):
    id: str
    user_id: str
    name: str
    cnpj: Optional[str]
    description: Optional[str]
    color: str
    created_at: datetime
