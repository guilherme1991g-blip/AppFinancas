from fastapi import APIRouter, Depends
from database import users_collection
from routers.auth import get_current_user
from models.user import NotificationPreferences
from bson import ObjectId

router = APIRouter(prefix="/preferences", tags=["preferences"])


@router.get("", response_model=NotificationPreferences)
async def get_preferences(current_user=Depends(get_current_user)):
    return NotificationPreferences(**current_user.get("preferences", {}))


@router.patch("", response_model=NotificationPreferences)
async def update_preferences(data: NotificationPreferences, current_user=Depends(get_current_user)):
    await users_collection.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"preferences": data.model_dump()}}
    )
    return data
