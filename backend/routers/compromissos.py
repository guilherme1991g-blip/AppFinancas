from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
from bson import ObjectId
from database import compromissos_collection
from routers.auth import get_current_user
from models.compromisso import CompromissoCreate, CompromissoUpdate, CompromissoResponse

router = APIRouter(prefix="/compromissos", tags=["compromissos"])


def serialize_compromisso(doc) -> dict:
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.post("", response_model=CompromissoResponse)
async def create_compromisso(compromisso: CompromissoCreate, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    doc = compromisso.dict()
    doc["user_id"] = user_id
    doc["created_at"] = datetime.utcnow()
    doc["updated_at"] = datetime.utcnow()
    
    result = await compromissos_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_compromisso(doc)


@router.get("", response_model=List[CompromissoResponse])
async def get_compromissos(current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    cursor = compromissos_collection.find({"user_id": user_id}).sort("date", 1)
    docs = await cursor.to_list(length=100)
    return [serialize_compromisso(doc) for doc in docs]


@router.get("/{compromisso_id}", response_model=CompromissoResponse)
async def get_compromisso(compromisso_id: str, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    doc = await compromissos_collection.find_one({"_id": ObjectId(compromisso_id), "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado")
    return serialize_compromisso(doc)


@router.put("/{compromisso_id}", response_model=CompromissoResponse)
async def update_compromisso(compromisso_id: str, compromisso: CompromissoUpdate, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    update_data = {k: v for k, v in compromisso.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await compromissos_collection.update_one(
        {"_id": ObjectId(compromisso_id), "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado")
        
    doc = await compromissos_collection.find_one({"_id": ObjectId(compromisso_id)})
    return serialize_compromisso(doc)


@router.delete("/{compromisso_id}")
async def delete_compromisso(compromisso_id: str, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    result = await compromissos_collection.delete_one({"_id": ObjectId(compromisso_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado")
    return {"message": "Compromisso removido com sucesso"}
