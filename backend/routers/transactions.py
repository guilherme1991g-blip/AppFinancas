from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from database import transactions_collection, accounts_collection, bills_collection
from models.transaction import TransactionCreate, TransactionUpdate, TransactionPaymentRequest
from routers.auth import get_current_user
from datetime import datetime
from bson import ObjectId

from utils.date_utils import safe_date, calculate_due_date

router = APIRouter(prefix="/transactions", tags=["transactions"])

async def check_bill_status(tx_doc, user_id):
    """Returns True if the transaction is on an open bill or not a credit card tx."""
    if not tx_doc: return True
    
    acc = await accounts_collection.find_one({"_id": tx_doc["account_id"], "user_id": user_id})
    if not acc or acc.get("type") != "credit_card":
        return True # Not a credit card, no bill restriction
        
    # Determine the transaction's month/year for billing
    # Using the same logic as bills listing: due_date > date
    dt = tx_doc.get("due_date") or tx_doc["date"]
    
    # Calculate closing/due dates to check "closed" status
    closing_day = acc.get("closing_day", 10)
    due_day = acc.get("due_day", closing_day + 7)
    
    m, y = dt.month, dt.year
    closing_date = safe_date(y, m, closing_day)
    
    if due_day > closing_day:
        due_date = safe_date(y, m, due_day)
    else:
        nm = m + 1 if m < 12 else 1
        ny = y if m < 12 else y + 1
        due_date = safe_date(ny, nm, due_day)
    
    now = datetime.utcnow()
    
    # Check physical bill doc
    bill = await bills_collection.find_one({
        "account_id": tx_doc["account_id"],
        "month": m,
        "year": y
    })
    
    if bill and bill.get("status") == "paid":
        return False
        
    # Check time-based "closed" status
    # If now is past closing_date, we can't add to this month's bill
    # Note: If it's the current month and we are past closing_date, this month's bill is closed.
    if now > closing_date:
        return False
        
    return True


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
        "recurring_id": str(doc["recurring_id"]) if doc.get("recurring_id") else None,
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
        nm = month + 1 if month < 12 else 1
        ny = year if month < 12 else year + 1
        end = datetime(ny, nm, 1)
        query["date"] = {"$gte": start, "$lt": end}
    elif year:
        start = datetime(year, 1, 1)
        end = datetime(year + 1, 1, 1)
        query["date"] = {"$gte": start, "$lt": end}

    docs = await transactions_collection.find(query).sort("date", -1).skip(skip).limit(limit).to_list(length=limit)
    return [tx_doc(d) for d in docs]


@router.post("")
async def create_transaction(data: TransactionCreate, current_user=Depends(get_current_user)):
    user_id = current_user["_id"]
    
    # Check bill status
    if not await check_bill_status(data.dict(), user_id):
        raise HTTPException(status_code=400, detail="Não é possível adicionar lançamentos a uma fatura fechada ou paga")

    # If it's a credit card transaction, calculate due_date if not provided
    acc = await accounts_collection.find_one({"_id": ObjectId(data.account_id), "user_id": user_id})
    
    # Recalculate due_date for credit cards if not provided
    due_date = data.due_date
    if acc and acc.get("type") == "credit_card" and not due_date:
        closing_day = acc.get("closing_day", 10)
        due_day = acc.get("due_day", closing_day + 7)
        due_date = calculate_due_date(data.date, closing_day, due_day)

    doc = {
        **data.dict(),
        "amount": abs(data.amount),
        "account_id": ObjectId(data.account_id),
        "category_id": ObjectId(data.category_id),
        "company_id": ObjectId(data.company_id) if data.company_id else None,
        "user_id": current_user["_id"],
        "due_date": due_date,
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
    
    if not await check_bill_status(old, current_user["_id"]):
        raise HTTPException(status_code=400, detail="Não é possível editar lançamentos de uma fatura já paga")

    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if "amount" in update_data:
        update_data["amount"] = abs(update_data["amount"])
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
async def delete_transaction(
    tx_id: str, 
    mode: str = Query("single", enum=["single", "future", "series"]),
    current_user=Depends(get_current_user)
):
    doc = await transactions_collection.find_one({"_id": ObjectId(tx_id), "user_id": current_user["_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    if not await check_bill_status(doc, current_user["_id"]):
        raise HTTPException(status_code=400, detail="Não é possível excluir lançamentos de uma fatura já paga")
    
    recurring_id = doc.get("recurring_id")
    user_id = current_user["_id"]

    if mode == "series" and recurring_id:
        # Delete everything linked to this recurring series
        txs = await transactions_collection.find({"recurring_id": recurring_id, "user_id": user_id}).to_list(1000)
        for tx in txs:
            if tx.get("is_paid"):
                delta = tx["amount"] if tx["type"] == "income" else -tx["amount"]
                await accounts_collection.update_one({"_id": tx["account_id"]}, {"$inc": {"balance": -delta}})
        
        await transactions_collection.delete_many({"recurring_id": recurring_id, "user_id": user_id})
        from database import recurring_collection
        await recurring_collection.delete_one({"_id": recurring_id, "user_id": user_id})
        return {"message": "Série recorrente removida"}

    if mode == "future" and recurring_id:
        # Delete this and all future Unpaid transactions in the series
        # We use the date of the current transaction as reference
        await transactions_collection.delete_many({
            "recurring_id": recurring_id,
            "user_id": user_id,
            "is_paid": False,
            "date": {"$gte": doc["date"]}
        })
        # If the current one is paid, handle it specifically
        if doc.get("is_paid"):
            delta = doc["amount"] if doc["type"] == "income" else -doc["amount"]
            await accounts_collection.update_one({"_id": doc["account_id"]}, {"$inc": {"balance": -delta}})
            await transactions_collection.delete_one({"_id": ObjectId(tx_id)})
        
        return {"message": "Lançamentos futuros removidos"}

    # Default: single
    # Revert balance ONLY if paid
    if doc.get("is_paid"):
        delta = doc["amount"] if doc["type"] == "income" else -doc["amount"]
        await accounts_collection.update_one({"_id": doc["account_id"]}, {"$inc": {"balance": -delta}})
    
    await transactions_collection.delete_one({"_id": ObjectId(tx_id)})
    return {"message": "Transação removida"}


@router.post("/{tx_id}/pay")
async def pay_transaction(tx_id: str, data: Optional[TransactionPaymentRequest] = None, current_user=Depends(get_current_user)):
    tx = await transactions_collection.find_one({"_id": ObjectId(tx_id), "user_id": current_user["_id"]})
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    if tx.get("is_paid"):
        raise HTTPException(status_code=400, detail="Transação já está paga")
    
    payment_date = (data.date if data else None) or datetime.utcnow()
    paid_amount = (data.amount if data else None)
    
    update_ops = {"$set": {"is_paid": True, "paid_at": payment_date}}
    
    final_amount = tx["amount"]
    if paid_amount is not None:
        final_amount = abs(paid_amount)
        update_ops["$set"]["amount"] = final_amount

    # Update transaction
    await transactions_collection.update_one(
        {"_id": ObjectId(tx_id)},
        update_ops
    )
    
    # Update account balance with the amount actually paid
    delta = final_amount if tx["type"] == "income" else -final_amount
    await accounts_collection.update_one(
        {"_id": tx["account_id"]},
        {"$inc": {"balance": delta}}
    )
    
    return {"message": "Transação marcada como paga"}
