from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from database import companies_collection
from models.company import CompanyCreate, CompanyUpdate
from routers.auth import get_current_user

router = APIRouter(prefix="/companies", tags=["companies"])


def company_doc(doc) -> dict:
    return {
        "id": str(doc["_id"]),
        "user_id": str(doc["user_id"]),
        "name": doc["name"],
        "cnpj": doc.get("cnpj"),
        "description": doc.get("description"),
        "color": doc.get("color", "#6C5ECF"),
        "created_at": doc["created_at"]
    }


@router.get("")
async def list_companies(current_user=Depends(get_current_user)):
    docs = await companies_collection.find({"user_id": current_user["_id"]}).to_list(50)
    return [company_doc(d) for d in docs]


@router.post("")
async def create_company(data: CompanyCreate, current_user=Depends(get_current_user)):
    doc = {**data.dict(), "user_id": current_user["_id"], "created_at": datetime.utcnow()}
    result = await companies_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return company_doc(doc)


@router.put("/{company_id}")
async def update_company(company_id: str, data: CompanyUpdate, current_user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    await companies_collection.update_one(
        {"_id": ObjectId(company_id), "user_id": current_user["_id"]},
        {"$set": update_data}
    )
    doc = await companies_collection.find_one({"_id": ObjectId(company_id)})
    return company_doc(doc)


@router.delete("/{company_id}")
async def delete_company(company_id: str, current_user=Depends(get_current_user)):
    await companies_collection.delete_one({"_id": ObjectId(company_id), "user_id": current_user["_id"]})
    return {"message": "Empresa removida"}
