from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from bson import ObjectId
from database import notifications_collection
from routers.auth import get_current_user
from models.notification import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])

def serialize_notification(doc) -> dict:
    return {
        "id": str(doc["_id"]),
        "title": doc["title"],
        "body": doc["body"],
        "type": doc["type"],
        "data": doc.get("data"),
        "created_at": doc["created_at"],
        "read": doc.get("read", False)
    }

@router.get("", response_model=List[NotificationResponse])
async def list_notifications(current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    cursor = notifications_collection.find({"user_id": user_id}).sort("created_at", -1)
    docs = await cursor.to_list(length=50)
    return [serialize_notification(d) for d in docs]

@router.post("/{notification_id}/read")
async def mark_as_read(notification_id: str, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    result = await notifications_collection.update_one(
        {"_id": ObjectId(notification_id), "user_id": user_id},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    return {"message": "Marcada como lida"}

@router.post("/read-all")
async def mark_all_as_read(current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    await notifications_collection.update_many(
        {"user_id": user_id, "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "Todas marcadas como lidas"}

@router.get("/test")
async def send_test_notification(current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    notif = {
        "user_id": user_id,
        "title": "Otto: Teste de Alerta! 🦾",
        "body": "Sua infraestrutura de notificações está funcionando perfeitamente. 🚀",
        "type": "system",
        "created_at": datetime.utcnow(),
        "read": False
    }
    result = await notifications_collection.insert_one(notif)
    
    # Trigger real push notification
    from utils.notifications import send_push_notification
    if current_user.get("push_token"):
        send_push_notification(current_user["push_token"], notif["title"], notif["body"])
    
    return {"message": "Notificação enviada para o celular e salva no histórico!", "id": str(result.inserted_id)}
