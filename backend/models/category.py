from pydantic import BaseModel
from typing import Optional
from enum import Enum


class CategoryType(str, Enum):
    income = "income"
    expense = "expense"


class CategoryCreate(BaseModel):
    name: str
    type: CategoryType
    icon: str = "tag"
    color: str = "#6C5ECF"
    parent_id: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryResponse(BaseModel):
    id: str
    user_id: str
    name: str
    type: CategoryType
    icon: str
    color: str
    parent_id: Optional[str]
    is_default: bool = False
