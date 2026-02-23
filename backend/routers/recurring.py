from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from database import recurring_collection
from models.recurring import RecurringCreate, RecurringUpdate
from routers.auth import get_current_user

router = APIRouter(prefix="/recurring", tags=["recurring"])


def rec_doc(doc) -> dict:
    return {
        "id": str(doc["_id"]),
        "user_id": str(doc["user_id"]),
        "account_id": str(doc["account_id"]),
        "category_id": str(doc["category_id"]),
        "type": doc["type"],
        "amount": doc["amount"],
        "description": doc["description"],
        "frequency": doc["frequency"],
        "start_date": doc["start_date"],
        "end_date": doc.get("end_date"),
        "day_of_month": doc.get("day_of_month"),
        "is_active": doc.get("is_active", True),
        "company_id": str(doc["company_id"]) if doc.get("company_id") else None,
        "created_at": doc["created_at"]
    }


@router.get("")
async def list_recurring(current_user=Depends(get_current_user)):
    docs = await recurring_collection.find({"user_id": current_user["_id"]}).to_list(100)
    return [rec_doc(d) for d in docs]


@router.post("")
async def create_recurring(data: RecurringCreate, current_user=Depends(get_current_user)):
    doc = {
        **data.dict(),
        "account_id": ObjectId(data.account_id),
        "category_id": ObjectId(data.category_id),
        "company_id": ObjectId(data.company_id) if data.company_id else None,
        "user_id": current_user["_id"],
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    result = await recurring_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return rec_doc(doc)


@router.put("/{rec_id}")
async def update_recurring(rec_id: str, data: RecurringUpdate, current_user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    await recurring_collection.update_one(
        {"_id": ObjectId(rec_id), "user_id": current_user["_id"]},
        {"$set": update_data}
    )
    doc = await recurring_collection.find_one({"_id": ObjectId(rec_id)})
    return rec_doc(doc)


@router.delete("/{rec_id}")
async def delete_recurring(rec_id: str, current_user=Depends(get_current_user)):
    await recurring_collection.delete_one({"_id": ObjectId(rec_id), "user_id": current_user["_id"]})
    return {"message": "Lançamento recorrente removido"}
