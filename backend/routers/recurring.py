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
        "installments": doc.get("installments"),
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
    
    # Create the first transaction immediately (Paid)
    from database import transactions_collection, accounts_collection
    from datetime import timedelta

    # Current/First transaction
    tx_doc_first = {
        "user_id": current_user["_id"],
        "account_id": ObjectId(data.account_id),
        "category_id": ObjectId(data.category_id),
        "company_id": ObjectId(data.company_id) if data.company_id else None,
        "type": data.type,
        "amount": data.amount,
        "description": data.description,
        "date": datetime.utcnow(),
        "is_paid": True,
        "created_at": datetime.utcnow(),
        "recurring_id": result.inserted_id
    }
    await transactions_collection.insert_one(tx_doc_first)
    
    # Update account balance for the first one
    delta = data.amount if data.type == "income" else -data.amount
    await accounts_collection.update_one(
        {"_id": ObjectId(data.account_id)},
        {"$inc": {"balance": delta}}
    )

    # Generate future occurrences
    if data.frequency == 'monthly':
        start_date = datetime.utcnow()
        # If installments is null, generate 12 months by default
        # If installments is provided, generate (installments - 1) more transactions (the first one is already created)
        limit = (data.installments - 1) if data.installments is not None else 11
        
        for i in range(1, limit + 1):
            # Safe month addition
            new_month = (start_date.month + i - 1) % 12 + 1
            new_year = start_date.year + (start_date.month + i - 1) // 12
            
            # Find the last valid day of the target month
            import calendar
            last_day = calendar.monthrange(new_year, new_month)[1]
            future_day = min(start_date.day, last_day)
            
            future_date = datetime(new_year, new_month, future_day)
            
            tx_future = {
                "user_id": current_user["_id"],
                "account_id": ObjectId(data.account_id),
                "category_id": ObjectId(data.category_id),
                "company_id": ObjectId(data.company_id) if data.company_id else None,
                "type": data.type,
                "amount": data.amount,
                "description": f"{data.description} ({i+1}/{data.installments})" if data.installments else data.description,
                "date": future_date,
                "is_paid": False,
                "due_date": future_date,
                "created_at": datetime.utcnow(),
                "recurring_id": result.inserted_id
            }
            await transactions_collection.insert_one(tx_future)

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
async def delete_recurring(
    rec_id: str, 
    mode: str = Query("rule_only", enum=["rule_only", "entire_series"]),
    current_user=Depends(get_current_user)
):
    user_id = current_user["_id"]
    obj_id = ObjectId(rec_id)

    if mode == "entire_series":
        # First, revert balance for all PAID transactions in the series
        from database import transactions_collection, accounts_collection
        txs = await transactions_collection.find({"recurring_id": obj_id, "user_id": user_id}).to_list(1000)
        for tx in txs:
            if tx.get("is_paid"):
                delta = tx["amount"] if tx["type"] == "income" else -tx["amount"]
                await accounts_collection.update_one({"_id": tx["account_id"]}, {"$inc": {"balance": -delta}})
        
        # Delete all transactions
        await transactions_collection.delete_many({"recurring_id": obj_id, "user_id": user_id})

    # Delete the recurring rule itself
    await recurring_collection.delete_one({"_id": obj_id, "user_id": user_id})
    return {"message": "Lançamento recorrente removido"}
