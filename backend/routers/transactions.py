from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from datetime import datetime
from typing import Optional
from database import transactions_collection, accounts_collection
from models.transaction import TransactionCreate, TransactionUpdate
from routers.auth import get_current_user

router = APIRouter(prefix="/transactions", tags=["transactions"])


def tx_doc(doc) -> dict:
    return {
        "id": str(doc["_id"]),
        "user_id": str(doc["user_id"]),
        "account_id": str(doc["account_id"]),
        "category_id": str(doc["category_id"]),
        "type": doc["type"],
        "amount": doc["amount"],
        "description": doc["description"],
        "date": doc["date"],
        "notes": doc.get("notes"),
        "tags": doc.get("tags", []),
        "company_id": str(doc["company_id"]) if doc.get("company_id") else None,
        "is_paid": doc.get("is_paid", True),
        "due_date": doc.get("due_date"),
        "paid_at": doc.get("paid_at"),
        "created_at": doc["created_at"]
    }


@router.get("")
async def list_transactions(
    account_id: Optional[str] = None,
    category_id: Optional[str] = None,
    type: Optional[str] = None,
    company_id: Optional[str] = None,
    is_paid: Optional[bool] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    limit: int = Query(50, le=200),
    skip: int = 0,
    current_user=Depends(get_current_user)
):
    query = {"user_id": current_user["_id"]}
    if account_id:
        query["account_id"] = ObjectId(account_id)
    if category_id:
        query["category_id"] = ObjectId(category_id)
    if type:
        query["type"] = type
    if company_id:
        query["company_id"] = ObjectId(company_id)
    if is_paid is not None:
        query["is_paid"] = is_paid
    if month and year:
        from datetime import datetime
        start = datetime(year, month, 1)
        end = datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
        query["date"] = {"$gte": start, "$lt": end}
    elif year:
        start = datetime(year, 1, 1)
        end = datetime(year + 1, 1, 1)
        query["date"] = {"$gte": start, "$lt": end}

    docs = await transactions_collection.find(query).sort("date", -1).skip(skip).limit(limit).to_list(length=limit)
    return [tx_doc(d) for d in docs]


@router.post("")
async def create_transaction(data: TransactionCreate, current_user=Depends(get_current_user)):
    doc = {
        **data.dict(),
        "account_id": ObjectId(data.account_id),
        "category_id": ObjectId(data.category_id),
        "company_id": ObjectId(data.company_id) if data.company_id else None,
        "user_id": current_user["_id"],
        "created_at": datetime.utcnow()
    }
    result = await transactions_collection.insert_one(doc)
    # Update account balance ONLY if paid
    if data.is_paid:
        delta = data.amount if data.type == "income" else -data.amount
        await accounts_collection.update_one(
            {"_id": ObjectId(data.account_id)},
            {"$inc": {"balance": delta}}
        )
    doc["_id"] = result.inserted_id
    return tx_doc(doc)


@router.put("/{tx_id}")
async def update_transaction(tx_id: str, data: TransactionUpdate, current_user=Depends(get_current_user)):
    old = await transactions_collection.find_one({"_id": ObjectId(tx_id), "user_id": current_user["_id"]})
    if not old:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if "category_id" in update_data:
        update_data["category_id"] = ObjectId(update_data["category_id"])
    # Revert old balance and apply new if amount changed
    if "amount" in update_data:
        old_delta = old["amount"] if old["type"] == "income" else -old["amount"]
        new_delta = update_data["amount"] if old["type"] == "income" else -update_data["amount"]
        await accounts_collection.update_one(
            {"_id": old["account_id"]},
            {"$inc": {"balance": -old_delta + new_delta}}
        )
    await transactions_collection.update_one({"_id": ObjectId(tx_id)}, {"$set": update_data})
    doc = await transactions_collection.find_one({"_id": ObjectId(tx_id)})
    return tx_doc(doc)


@router.delete("/{tx_id}")
async def delete_transaction(tx_id: str, current_user=Depends(get_current_user)):
    doc = await transactions_collection.find_one({"_id": ObjectId(tx_id), "user_id": current_user["_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    # Revert balance
    delta = doc["amount"] if doc["type"] == "income" else -doc["amount"]
    await accounts_collection.update_one({"_id": doc["account_id"]}, {"$inc": {"balance": -delta}})
    await transactions_collection.delete_one({"_id": ObjectId(tx_id)})
    return {"message": "Transação removida"}


@router.post("/{tx_id}/pay")
async def pay_transaction(tx_id: str, current_user=Depends(get_current_user)):
    tx = await transactions_collection.find_one({"_id": ObjectId(tx_id), "user_id": current_user["_id"]})
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    if tx.get("is_paid"):
        raise HTTPException(status_code=400, detail="Transação já está paga")
    
    # Update transaction
    await transactions_collection.update_one(
        {"_id": ObjectId(tx_id)},
        {"$set": {"is_paid": True, "paid_at": datetime.utcnow()}}
    )
    
    # Update account balance
    delta = tx["amount"] if tx["type"] == "income" else -tx["amount"]
    await accounts_collection.update_one(
        {"_id": tx["account_id"]},
        {"$inc": {"balance": delta}}
    )
    
    return {"message": "Transação marcada como paga"}
