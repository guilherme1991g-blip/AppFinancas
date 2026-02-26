from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Optional
from database import bills_collection, transactions_collection, accounts_collection, categories_collection
from routers.auth import get_current_user
from models.transaction import BillPaymentRequest

router = APIRouter(prefix="/bills", tags=["bills"])

def bill_doc(doc) -> dict:
    return {
        "id": str(doc["_id"]),
        "account_id": str(doc["account_id"]),
        "month": doc["month"],
        "year": doc["year"],
        "amount": abs(doc.get("amount", 0)),
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
    
    pipeline = [
        {"$match": {
            "account_id": ObjectId(account_id),
            "user_id": current_user["_id"]
        }},
        {"$group": {
            "_id": {
                "month": {"$month": {"$ifNull": ["$due_date", "$date"]}},
                "year": {"$year": {"$ifNull": ["$due_date", "$date"]}}
            },
            "total": {"$sum": {"$cond": [
                {"$eq": ["$type", "expense"]}, 
                {"$abs": "$amount"}, 
                {"$multiply": [{"$abs": "$amount"}, -1]}
            ]}}
        }},
        {"$match": {
            "total": {"$gt": 0.01},
            "_id.month": {"$ne": None},
            "_id.year": {"$ne": None}
        }},
        {"$sort": {"_id.year": -1, "_id.month": -1}}
    ]
    results = await transactions_collection.aggregate(pipeline).to_list(24)
    
    # 1. Get existing bills for backup/metadata
    existing_docs = await bills_collection.find({"account_id": ObjectId(account_id)}).to_list(length=100)
    existing_map = {(d["month"], d["year"]): d for d in existing_docs}

    bills = []
    for r in results:
        m, y = r["_id"]["month"], r["_id"]["year"]
        
        if (m, y) in existing_map:
            # Use data from the physical bill document
            bills.append(bill_doc(existing_map[(m, y)]))
        else:
            # Generate a virtual bill
            closing_day = acc.get("closing_day", 10)
        tx_total = abs(r.get("total", 0))
        
        bill_doc_data = existing_map.get((m, y))

        # Calculate dates for status logic
        closing_day = acc.get("closing_day", 10)
        closing_date = datetime(y, m, closing_day)
        due_day = acc.get("due_day", closing_day + 7)
        
        # Find due date (can be next month if closing is late)
        due_date = datetime(y, m, due_day) if due_day > closing_day else (datetime(y, m+1, due_day) if m < 12 else datetime(y+1, 1, due_day))
        
        # Status logic
        now_dt = datetime.utcnow()
        if bill_doc_data and bill_doc_data.get("status") == "paid":
             status = "paid"
        elif tx_total <= 0: # If total is 0 or negative (e.g., only income transactions), consider it paid
             status = "paid"
        elif now_dt < closing_date:
             status = "open"
        elif now_dt < due_date:
             status = "closed"
        else:
             status = "overdue"

        bills.append({
            "id": str(bill_doc_data["_id"]) if bill_doc_data else f"v_{account_id}_{m}_{y}",
            "account_id": str(account_id),
            "month": m,
            "year": y,
            "amount": tx_total,
            "status": status,
            "due_date": due_date.isoformat(),
            "closing_date": closing_date.isoformat(),
            "created_at": bill_doc_data["created_at"].isoformat() if bill_doc_data else datetime.utcnow().isoformat()
        })

    # Sort final list
    bills.sort(key=lambda x: (x["year"], x["month"]), reverse=True)
    return bills[:24]

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
            "user_id": current_user["_id"],
            "type": "expense",
            "$or": [
                {"due_date": {"$gte": start_date, "$lt": end_date}},
                {"due_date": None, "date": {"$gte": start_date, "$lt": end_date}}
            ]
        }
    else:
        bill = await bills_collection.find_one({"_id": ObjectId(bill_id)})
        if not bill:
            raise HTTPException(status_code=404, detail="Fatura não encontrada")
        
        # Consistent date range for physical bills using start/end markers
        from datetime import timedelta
        start_date = bill["closing_date"] - timedelta(days=32)
        end_date = bill["closing_date"] + timedelta(days=1)
        
        query = {
            "account_id": bill["account_id"],
            "user_id": current_user["_id"],
            "type": "expense",
            "$or": [
                {"due_date": {"$gte": start_date, "$lt": end_date}},
                {"due_date": None, "date": {"$gte": start_date, "$lt": end_date}}
            ]
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
async def pay_bill(bill_id: str, data: BillPaymentRequest, current_user=Depends(get_current_user)):
    payment_account_id = data.payment_account_id
    payment_date = data.date or datetime.utcnow()
    
    # 1. Handle Virtual Bill
    if bill_id.startswith("v_"):
        parts = bill_id.split("_")
        account_id = parts[1]
        month = int(parts[2])
        year = int(parts[3])
        
        acc = await accounts_collection.find_one({"_id": ObjectId(account_id), "user_id": current_user["_id"]})
        if not acc:
            raise HTTPException(status_code=404, detail="Cartão não encontrado")
            
        # Get total for this virtual bill
        pipeline = [
            {"$match": {
                "account_id": ObjectId(account_id),
                "user_id": current_user["_id"],
                "type": "expense",
                "$or": [
                    {"due_date": {"$month": month, "$year": year}}, # This is not direct mongo syntax, need proper date matching
                    {"due_date": None, "date": {"$month": month, "$year": year}}
                ]
            }},
            {"$group": {"_id": None, "total": {"$sum": {"$abs": "$amount"}}}}
        ]
        # Actually I already have the logic in list_bills, but here I just need to create the doc.
        # Let's simplify: the amount comes from 'data.amount' or we fetch it.
        # For virtual bills, 'data.amount' should be provided by frontend based on what it displayed.
        amount_to_pay = data.amount if data.amount is not None else 0 # Should probably fetch if None
        
        if data.amount is None:
             # Fetch if amount not provided (fallback)
             start_date = datetime(year, month, 1)
             end_date = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)
             query = {
                "account_id": ObjectId(account_id),
                "user_id": current_user["_id"],
                "type": "expense",
                "$or": [
                    {"due_date": {"$gte": start_date, "$lt": end_date}},
                    {"due_date": None, "date": {"$gte": start_date, "$lt": end_date}}
                ]
             }
             total = 0
             async for tx in transactions_collection.find(query):
                 total += abs(tx["amount"])
             amount_to_pay = total

        # Create physical bill
        new_bill = {
            "account_id": ObjectId(account_id),
            "month": month,
            "year": year,
            "amount": amount_to_pay,
            "status": "paid", # Mark as paid since it's a payment action
            "due_date": payment_date, # fallback
            "closing_date": payment_date, # fallback
            "created_at": datetime.utcnow()
        }
        res = await bills_collection.insert_one(new_bill)
        bill = {**new_bill, "_id": res.inserted_id}
    else:
        bill = await bills_collection.find_one({"_id": ObjectId(bill_id)})
        if not bill:
            raise HTTPException(status_code=404, detail="Fatura não encontrada")
        if bill["status"] == "paid":
            raise HTTPException(status_code=400, detail="Fatura já está paga")
        amount_to_pay = data.amount if data.amount is not None else bill.get("amount", 0)

    # 2. Create the payment transaction in the SOURCE account (outflow)
    payment_acc = await accounts_collection.find_one({"_id": ObjectId(payment_account_id), "user_id": current_user["_id"]})
    if not payment_acc:
        raise HTTPException(status_code=404, detail="Conta de pagamento não encontrada")
    
    # Get a category for "Pagamento" or use a generic one
    cat = await categories_collection.find_one({"name": {"$regex": "Fatura|Pagamento", "$options": "i"}})
    cat_id = cat["_id"] if cat else None
    if not cat_id:
        # Fallback to any category
        cat = await categories_collection.find_one({})
        cat_id = cat["_id"] if cat else ObjectId()

    # Get card name
    card_acc = await accounts_collection.find_one({"_id": bill["account_id"]})
    card_name = card_acc["name"] if card_acc else "Cartão"

    # Outflow from checking/savings
    payment_tx_out = {
        "user_id": current_user["_id"],
        "account_id": ObjectId(payment_account_id),
        "category_id": cat_id,
        "type": "expense",
        "amount": abs(amount_to_pay),
        "description": f"Pagamento Fatura {card_name} - {bill['month']}/{bill['year']}",
        "date": payment_date,
        "is_paid": True,
        "paid_at": payment_date,
        "created_at": datetime.utcnow()
    }
    await transactions_collection.insert_one(payment_tx_out)

    # 3. Create a mirrored "Income" in the CARD account (debt reduction)
    # This makes the payment visible in the bill details and reduces the total
    payment_tx_in = {
        "user_id": current_user["_id"],
        "account_id": bill["account_id"],
        "category_id": cat_id,
        "type": "income",
        "amount": abs(amount_to_pay),
        "description": f"Pagamento Recebido - {bill['month']}/{bill['year']}",
        "date": payment_date,
        "due_date": datetime(bill["year"], bill["month"], 1), # Force it into this bill
        "is_paid": True,
        "paid_at": payment_date,
        "created_at": datetime.utcnow()
    }
    await transactions_collection.insert_one(payment_tx_in)

    # 4. Update account balances
    # Decrease checking account balance
    await accounts_collection.update_one(
        {"_id": ObjectId(payment_account_id)},
        {"$inc": {"balance": -abs(amount_to_pay)}}
    )

    # Decrease card debt (increase balance field)
    await accounts_collection.update_one(
        {"_id": bill["account_id"]},
        {"$inc": {"balance": abs(amount_to_pay)}}
    )

    # 5. Handle Partial Payment & Rollover
    # If the user paid less than the full amount, the difference moves to the next month
    if amount_to_pay < (bill.get("amount", 0) - 0.01):
        diff = bill.get("amount", 0) - amount_to_pay
        
        # Determine next month for rollover
        m, y = bill["month"], bill["year"]
        next_m = m + 1 if m < 12 else 1
        next_y = y if m < 12 else y + 1
        next_date = datetime(next_y, next_m, 1)

        # A. Create an "Income" in THIS month for the diff (clears this bill)
        # This makes the Current Month Expenses - Income = amount_to_pay
        # But this is NOT a real income, it's a rollover.
        # We also need to avoid double-counting in the account balance.
        # So we create a pair that is balance-neutral.
        
        rollover_in = {
            "user_id": current_user["_id"],
            "account_id": bill["account_id"],
            "category_id": cat_id,
            "type": "income", # To reduce the bill amount
            "amount": abs(diff),
            "description": f"Rolagem p/ {next_m}/{next_y}",
            "date": payment_date,
            "is_paid": True,
            "paid_at": payment_date,
            "created_at": datetime.utcnow()
        }
        await transactions_collection.insert_one(rollover_in)

        # B. Create an "Expense" in NEXT month for the diff
        rollover_out = {
            "user_id": current_user["_id"],
            "account_id": bill["account_id"],
            "category_id": cat_id,
            "type": "expense",
            "amount": abs(diff),
            "description": f"Saldo Anterior - {m}/{y}",
            "date": next_date, # Forces it into next month
            "is_paid": True, # It's debt that exists, so it's "paid" in terms of account balance flow (already spent)
            "paid_at": next_date,
            "created_at": datetime.utcnow()
        }
        await transactions_collection.insert_one(rollover_out)
        
        # Balance Neutral: Account balance doesn't change because Income + Expense cancel out.
        # (Income +diff, Expense -diff) -> net 0.
        # But for bill aggregation:
        # Current bill: -diff
        # Next bill: +diff

    # 6. Update bill status
    if not bill_id.startswith("v_"):
        await bills_collection.update_one(
            {"_id": ObjectId(bill_id)}, 
            {"$set": {"status": "paid", "paid_at": payment_date, "amount": amount_to_pay}}
        )
    
    return {"message": "Fatura paga com sucesso", "bill_id": str(bill["_id"])}
