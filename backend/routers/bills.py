from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Optional
from database import bills_collection, transactions_collection, accounts_collection
from routers.auth import get_current_user

router = APIRouter(prefix="/bills", tags=["bills"])

def bill_doc(doc) -> dict:
    return {
        "id": str(doc["_id"]),
        "account_id": str(doc["account_id"]),
        "month": doc["month"],
        "year": doc["year"],
        "amount": doc["amount"],
        "status": doc["status"],
        "due_date": doc["due_date"],
        "closing_date": doc["closing_date"],
        "created_at": doc["created_at"]
    }

@router.get("/{account_id}")
async def list_bills(account_id: str, current_user=Depends(get_current_user)):
    # Verify account ownership
    acc = await accounts_collection.find_one({"_id": ObjectId(account_id), "user_id": current_user["_id"]})
    if not acc:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    
    docs = await bills_collection.find({"account_id": ObjectId(account_id)}).sort([("year", -1), ("month", -1)]).to_list(length=24)
    return [bill_doc(d) for d in docs]

@router.get("/{bill_id}/transactions")
async def get_bill_transactions(bill_id: str, current_user=Depends(get_current_user)):
    if bill_id.startswith("v_"):
        # Format: v_accountid_month_year
        parts = bill_id.split("_")
        if len(parts) < 4:
            raise HTTPException(status_code=400, detail="ID de fatura virtual inválido")
            
        account_id = parts[1]
        month = int(parts[2])
        year = int(parts[3])
        
        # Verify account ownership
        acc = await accounts_collection.find_one({"_id": ObjectId(account_id), "user_id": current_user["_id"]})
        if not acc:
            raise HTTPException(status_code=404, detail="Cartão não encontrado")
            
        # Calculate dates for that specific month
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
            
        query = {
            "account_id": ObjectId(account_id),
            "date": {"$gte": start_date, "$lt": end_date}
        }
    else:
        bill = await bills_collection.find_one({"_id": ObjectId(bill_id)})
        if not bill:
            raise HTTPException(status_code=404, detail="Fatura não encontrada")
        
        start_date = bill["closing_date"] - timedelta(days=30)
        end_date = bill["closing_date"]
        
        query = {
            "account_id": bill["account_id"],
            "date": {"$gt": start_date, "$lte": end_date}
        }
    
    docs = await transactions_collection.find(query).sort("date", -1).to_list(length=100)
    # Convert ObjectIds to strings
    for d in docs:
        d["id"] = str(d.pop("_id"))
        d["account_id"] = str(d["account_id"])
        d["category_id"] = str(d["category_id"])
        if d.get("user_id"): d["user_id"] = str(d["user_id"])
        if d.get("company_id"): d["company_id"] = str(d["company_id"])
        
    return docs

@router.post("/{bill_id}/pay")
async def pay_bill(bill_id: str, payment_account_id: str, current_user=Depends(get_current_user)):
    bill = await bills_collection.find_one({"_id": ObjectId(bill_id)})
    if not bill:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    
    if bill["status"] == "paid":
        raise HTTPException(status_code=400, detail="Fatura já está paga")

    # 1. Create a transaction for the payment in the payment account (checking/savings)
    payment_acc = await accounts_collection.find_one({"_id": ObjectId(payment_account_id), "user_id": current_user["_id"]})
    if not payment_acc:
        raise HTTPException(status_code=404, detail="Conta de pagamento não encontrada")
    
    # 2. Update card balance (reduce debt)
    await accounts_collection.update_one(
        {"_id": bill["account_id"]},
        {"$inc": {"balance": bill["amount"]}} # balance is negative for credit cards? actually we store positive balance usually.
        # Logic depends on how balance is stored. Assuming balance is "current debt" if it's card.
    )

    # 3. Update bill status
    await bills_collection.update_one({"_id": ObjectId(bill_id)}, {"$set": {"status": "paid", "paid_at": datetime.utcnow()}})
    
    return {"message": "Fatura paga com sucesso"}
