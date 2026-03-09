from fastapi import APIRouter, Depends, HTTPException
from database import users_collection
from routers.auth import get_current_user
from models.user import NotificationPreferences, UserPreferences, SecurityPreferences, DashboardCard
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional, List
import secrets

router = APIRouter(prefix="/preferences", tags=["preferences"])


def _parse_preferences(raw: dict) -> UserPreferences:
    """Parse preferences from DB with backward compatibility."""
    if not raw:
        return UserPreferences()

    # Check if it's the old flat format
    is_old = any(k in raw for k in NotificationPreferences.model_fields)
    
    if is_old:
        notif_fields = {k: v for k, v in raw.items() if k in NotificationPreferences.model_fields}
        security_fields = {k: v for k, v in raw.items() if k in SecurityPreferences.model_fields}
        return UserPreferences(
            notifications=NotificationPreferences(**notif_fields),
            security=SecurityPreferences(**security_fields),
            language=raw.get("language", "pt-BR"),
            currency=raw.get("currency", "BRL"),
            theme=raw.get("theme", "light"),
            dashboard_cards=raw.get("dashboard_cards") or get_default_dashboard_cards()
        )

    # New format - handle potential validation errors gracefully
    try:
        return UserPreferences(**raw)
    except Exception as e:
        print(f"ERROR parsing preferences: {e}")
        # Return defaults but log it
        return UserPreferences()


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
    dashboard_cards: Optional[List[DashboardCard]] = None


@router.patch("", response_model=UserPreferences)
async def update_preferences(data: PreferencesUpdate, current_user=Depends(get_current_user)):
    user_id = current_user["_id"]
    
    # Get only the fields explicitly sent by the client
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Sem dados para atualizar")

    # Construct the $set dictionary for nested preferences
    set_query = {}
    for key, value in update_data.items():
        # Pydantic models need to be dumped to dict for MongoDB
        if hasattr(value, "model_dump"):
            set_query[f"preferences.{key}"] = value.model_dump()
        elif isinstance(value, list) and len(value) > 0 and hasattr(value[0], "model_dump"):
            set_query[f"preferences.{key}"] = [item.model_dump() for item in value]
        else:
            set_query[f"preferences.{key}"] = value

    # Final check: ensure the preferences object exists
    await users_collection.update_one(
        {"_id": user_id},
        {"$set": set_query},
        upsert=True
    )
    
    # Fetch updated user to return fresh preferences
    updated_user = await users_collection.find_one({"_id": user_id})
    return _parse_preferences(updated_user.get("preferences", {}))


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
