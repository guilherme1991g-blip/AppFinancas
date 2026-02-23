from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from database import accounts_collection
from models.account import AccountCreate, AccountUpdate, AccountResponse
from routers.auth import get_current_user

router = APIRouter(prefix="/accounts", tags=["accounts"])


def account_doc(doc) -> dict:
    return {
        "id": str(doc["_id"]),
        "user_id": str(doc["user_id"]),
        "name": doc["name"],
        "type": doc["type"],
        "bank": doc.get("bank"),
        "balance": doc["balance"],
        "color": doc.get("color", "#00D09C"),
        "icon": doc.get("icon", "wallet"),
        "company_id": str(doc["company_id"]) if doc.get("company_id") else None
    }


@router.get("")
async def list_accounts(current_user=Depends(get_current_user)):
    docs = await accounts_collection.find({"user_id": current_user["_id"]}).to_list(length=100)
    return [account_doc(d) for d in docs]


@router.post("")
async def create_account(data: AccountCreate, current_user=Depends(get_current_user)):
    doc = {
        **data.dict(),
        "user_id": current_user["_id"],
        "company_id": ObjectId(data.company_id) if data.company_id else None,
        "created_at": datetime.utcnow()
    }
    result = await accounts_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return account_doc(doc)


@router.put("/{account_id}")
async def update_account(account_id: str, data: AccountUpdate, current_user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    result = await accounts_collection.update_one(
        {"_id": ObjectId(account_id), "user_id": current_user["_id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    doc = await accounts_collection.find_one({"_id": ObjectId(account_id)})
    return account_doc(doc)


@router.delete("/{account_id}")
async def delete_account(account_id: str, current_user=Depends(get_current_user)):
    result = await accounts_collection.delete_one(
        {"_id": ObjectId(account_id), "user_id": current_user["_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return {"message": "Conta removida"}
