from fastapi import APIRouter, Depends, HTTPException
from database import users_collection
from routers.auth import get_current_user
from models.user import NotificationPreferences, UserPreferences, SecurityPreferences
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/preferences", tags=["preferences"])


def _parse_preferences(raw: dict) -> UserPreferences:
    """Parse preferences from DB with backward compatibility.
    
    Old format (flat): { bill_reminders: true, budget_alerts: true, ... }
    New format (nested): { notifications: {...}, security: {...}, language: "pt-BR", currency: "BRL", theme: "light" }
    """
    if not raw:
        return UserPreferences()

    # Check if it's the old flat format (has notification keys at top level)
    if "bill_reminders" in raw or "budget_alerts" in raw:
        # Old format: wrap notification fields into nested structure
        notif_fields = {
            k: v for k, v in raw.items()
            if k in NotificationPreferences.model_fields
        }
        return UserPreferences(
            notifications=NotificationPreferences(**notif_fields),
            security=SecurityPreferences(**{k: v for k, v in raw.items() if k in SecurityPreferences.model_fields}),
            language=raw.get("language", "pt-BR"),
            currency=raw.get("currency", "BRL"),
            theme=raw.get("theme", "light"),
        )

    # New format
    return UserPreferences(**raw)


@router.get("", response_model=UserPreferences)
async def get_preferences(current_user=Depends(get_current_user)):
    raw = current_user.get("preferences", {})
    return _parse_preferences(raw)


class PreferencesUpdate(BaseModel):
    """Partial update model — all fields optional."""
    notifications: Optional[NotificationPreferences] = None
    security: Optional[SecurityPreferences] = None
    language: Optional[str] = None
    currency: Optional[str] = None
    theme: Optional[str] = None
    whatsapp_enabled: Optional[bool] = None


@router.patch("", response_model=UserPreferences)
async def update_preferences(data: PreferencesUpdate, current_user=Depends(get_current_user)):
    # Load current preferences (with backward compat)
    raw = current_user.get("preferences", {})
    current = _parse_preferences(raw)

    # Merge updates
    if data.notifications is not None:
        current.notifications = data.notifications
    if data.security is not None:
        current.security = data.security
    if data.language is not None:
        current.language = data.language
    if data.currency is not None:
        current.currency = data.currency
    if data.theme is not None:
        current.theme = data.theme
    if data.whatsapp_enabled is not None:
        current.whatsapp_enabled = data.whatsapp_enabled

    # Save in new format
    await users_collection.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"preferences": current.model_dump()}}
    )
    return current


@router.post("/push-token")
async def save_push_token(data: dict, current_user=Depends(get_current_user)):
    token = data.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Token não fornecido")

    await users_collection.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"push_token": token}}
    )
    return {"message": "Token salvo com sucesso"}
