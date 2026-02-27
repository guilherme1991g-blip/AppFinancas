from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class NotificationBase(BaseModel):
    title: str
    body: str
    type: str  # 'overdue', 'budget', 'agenda', 'system'
    data: Optional[Dict[str, Any]] = None

class NotificationCreate(NotificationBase):
    user_id: str

class NotificationResponse(NotificationBase):
    id: str
    created_at: datetime
    read: bool = False
