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
    from database import transactions_collection, transfers_collection, recurring_collection
    
    obj_id = ObjectId(account_id)
    user_id = current_user["_id"]
    
    # Check for linked transactions
    has_transactions = await transactions_collection.find_one({
        "user_id": user_id,
        "$or": [{"account_id": obj_id}, {"to_account_id": obj_id}]
    })
    if has_transactions:
        raise HTTPException(
            status_code=400, 
            detail="Não é possível excluir uma conta que possui transações vinculadas. Exclua as transações primeiro."
        )
        
    # Check for linked transfers
    has_transfers = await transfers_collection.find_one({
        "user_id": user_id,
        "$or": [{"from_account_id": obj_id}, {"to_account_id": obj_id}]
    })
    if has_transfers:
        raise HTTPException(
            status_code=400, 
            detail="Não é possível excluir uma conta que possui transferências vinculadas. Exclua as transferências primeiro."
        )

    # Check for linked recurring transactions
    has_recurring = await recurring_collection.find_one({
        "user_id": user_id,
        "account_id": obj_id
    })
    if has_recurring:
        raise HTTPException(
            status_code=400, 
            detail="Não é possível excluir uma conta que possui lançamentos recorrentes vinculados. Remova os lançamentos recorrentes primeiro."
        )

    result = await accounts_collection.delete_one(
        {"_id": obj_id, "user_id": user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return {"message": "Conta removida"}
