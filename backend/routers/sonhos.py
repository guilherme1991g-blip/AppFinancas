from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
from bson import ObjectId
from database import sonhos_collection
from routers.auth import get_current_user
from models.sonho import SonhoCreate, SonhoUpdate, SonhoResponse

router = APIRouter(prefix="/sonhos", tags=["sonhos"])


def serialize_sonho(doc) -> dict:
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.post("/", response_model=SonhoResponse)
async def create_sonho(sonho: SonhoCreate, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    doc = sonho.dict()
    doc["user_id"] = user_id
    doc["created_at"] = datetime.utcnow()
    doc["updated_at"] = datetime.utcnow()
    
    result = await sonhos_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_sonho(doc)


@router.get("/", response_model=List[SonhoResponse])
async def get_sonhos(current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    cursor = sonhos_collection.find({"user_id": user_id}).sort("created_at", -1)
    docs = await cursor.to_list(length=100)
    return [serialize_sonho(doc) for doc in docs]


@router.get("/{sonho_id}", response_model=SonhoResponse)
async def get_sonho(sonho_id: str, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    doc = await sonhos_collection.find_one({"_id": ObjectId(sonho_id), "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Sonho não encontrado")
    return serialize_sonho(doc)


@router.put("/{sonho_id}", response_model=SonhoResponse)
async def update_sonho(sonho_id: str, sonho: SonhoUpdate, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    update_data = {k: v for k, v in sonho.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await sonhos_collection.update_one(
        {"_id": ObjectId(sonho_id), "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sonho não encontrado")
        
    doc = await sonhos_collection.find_one({"_id": ObjectId(sonho_id)})
    return serialize_sonho(doc)


@router.delete("/{sonho_id}")
async def delete_sonho(sonho_id: str, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    result = await sonhos_collection.delete_one({"_id": ObjectId(sonho_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sonho não encontrado")
    return {"message": "Sonho removido com sucesso"}
