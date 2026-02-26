from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Optional
from database import bills_collection, transactions_collection, accounts_collection, categories_collection
from routers.auth import get_current_user
from models.transaction import BillPaymentRequest

import calendar

router = APIRouter(prefix="/bills", tags=["bills"])

def safe_date(year, month, day):
    # Adjust day if it exceeds the last day of the month
    _, last_day = calendar.monthrange(year, month)
    return datetime(year, month, min(day, last_day))

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
            "expenses": {"$sum": {"$cond": [{"$eq": ["$type", "expense"]}, {"$abs": "$amount"}, 0]}},
            "payments": {"$sum": {"$cond": [
                {"$and": [
                    {"$eq": ["$type", "income"]},
                    {"$not": {"$regexMatch": {"input": {"$ifNull": ["$description", ""]}, "regex": "Rolagem", "options": "i"}}}
                ]},
                {"$abs": "$amount"}, 0
            ]}},
            "rollover_income": {"$sum": {"$cond": [
                {"$and": [
                    {"$eq": ["$type", "income"]},
                    {"$regexMatch": {"input": {"$ifNull": ["$description", ""]}, "regex": "Rolagem", "options": "i"}}
                ]},
                {"$abs": "$amount"}, 0
            ]}}
        }},
        {"$addFields": {
            "total": {"$subtract": ["$expenses", {"$add": ["$payments", "$rollover_income"]}]}
        }},
        {"$match": {
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
        expenses = r.get("expenses", 0)
        payments = r.get("payments", 0)
        rollover_income = r.get("rollover_income", 0)
        tx_total = r.get("total", 0)
        
        bill_doc_data = existing_map.get((m, y))

        # Calculate dates for status logic
        closing_day = acc.get("closing_day", 10)
        closing_date = safe_date(y, m, closing_day)
        due_day = acc.get("due_day", closing_day + 7)
        
        # Find due date (can be next month if closing is late)
        if due_day > closing_day:
            due_date = safe_date(y, m, due_day)
        else:
            nm = m + 1 if m < 12 else 1
            ny = y if m < 12 else y + 1
            due_date = safe_date(ny, nm, due_day)
        
        # Status logic
        now_dt = datetime.utcnow()
        
        if now_dt < closing_date:
            status = "open" # Before closing, it's always open even if paid in advance
        else:
            # After closing
            if tx_total <= 0.01:
                # If fully settled, check if it was by rollover vs fully paid
                if rollover_income > 0.01:
                    status = "partially_paid"
                else:
                    status = "paid"
            elif payments > 0:
                status = "partially_paid" # Paid something but not all
            elif now_dt > due_date:
                status = "overdue"
            else:
                status = "closed" # Closed but not yet paid

        # If it's explicitly marked as paid in DB, honor it
        if bill_doc_data and bill_doc_data.get("status") == "paid":
             status = "paid"

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
    
    # 1. Handle Bill Lookup and Account Fetching
    if bill_id.startswith("v_"):
        parts = bill_id.split("_")
        account_id, month, year = parts[1], int(parts[2]), int(parts[3])
        acc = await accounts_collection.find_one({"_id": ObjectId(account_id), "user_id": current_user["_id"]})
        if not acc: raise HTTPException(status_code=404, detail="Cartão não encontrado")
        
        # Calculate totals for virtual bill creation later
        start_date = datetime(year, month, 1)
        end_date = safe_date(year + 1, 1, 1) if month == 12 else safe_date(year, month + 1, 1)
        expenses_query = {
            "account_id": ObjectId(account_id), "user_id": current_user["_id"], "type": "expense",
            "$or": [{"due_date": {"$gte": start_date, "$lt": end_date}}, {"due_date": None, "date": {"$gte": start_date, "$lt": end_date}}]
        }
        total_bill_expenses = 0
        async for tx in transactions_collection.find(expenses_query):
            total_bill_expenses += abs(tx["amount"])

        amount_to_pay = data.amount if data.amount is not None else total_bill_expenses
        
        # Create physical bill and set 'bill' object
        new_bill = {
            "account_id": ObjectId(account_id), "month": month, "year": year,
            "amount": total_bill_expenses, "status": "open",
            "due_date": safe_date(year, month, acc.get("due_day", 17)), 
            "closing_date": safe_date(year, month, acc.get("closing_day", 10)),
            "created_at": datetime.utcnow()
        }
        res = await bills_collection.insert_one(new_bill)
        bill = {**new_bill, "_id": res.inserted_id}
    else:
        bill = await bills_collection.find_one({"_id": ObjectId(bill_id)})
        if not bill: raise HTTPException(status_code=404, detail="Fatura não encontrada")
        if bill["status"] == "paid": raise HTTPException(status_code=400, detail="Fatura já está paga")
        
        acc = await accounts_collection.find_one({"_id": bill["account_id"], "user_id": current_user["_id"]})
        if not acc: raise HTTPException(status_code=404, detail="Cartão não encontrado")
        amount_to_pay = data.amount if data.amount is not None else bill.get("amount", 0)

    # EARLY BLOCK CHECK (Run once after acc and bill are ready)
    closing_day = acc.get("closing_day", 10)
    closing_date = safe_date(bill["year"], bill["month"], closing_day)
    if datetime.utcnow() < closing_date:
        raise HTTPException(status_code=400, detail="Fatura ainda está aberta. Aguarde o fechamento para pagar.")

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

    # (closing_date is already calculated at the beginning)
    
    # 5. Handle Partial Payment & Rollover
    # Rollover ONLY happens if the bill is ALREADY CLOSED (now >= closing_date)
    # Before closing, any payment is just an "Advance" which reduces the total via the Income transaction.
    full_amount = bill.get("amount", 0)
    if payment_date >= closing_date and amount_to_pay < (full_amount - 0.01):
        diff = full_amount - amount_to_pay
        
        # Determine next month for rollover
        m, y = bill["month"], bill["year"]
        next_m = m + 1 if m < 12 else 1
        next_y = y if m < 12 else y + 1
        next_date = datetime(next_y, next_m, 1)

        # Create balance-neutral rollover pair
        rollover_in = {
            "user_id": current_user["_id"],
            "account_id": bill["account_id"],
            "category_id": cat_id,
            "type": "income",
            "amount": abs(diff),
            "description": f"Rolagem p/ {next_m}/{next_y}",
            "date": payment_date,
            "is_paid": True,
            "paid_at": payment_date,
            "created_at": datetime.utcnow()
        }
        await transactions_collection.insert_one(rollover_in)

        rollover_out = {
            "user_id": current_user["_id"],
            "account_id": bill["account_id"],
            "category_id": cat_id,
            "type": "expense",
            "amount": abs(diff),
            "description": f"Saldo Anterior - {m}/{y}",
            "date": next_date,
            "is_paid": True,
            "paid_at": next_date,
            "created_at": datetime.utcnow()
        }
        await transactions_collection.insert_one(rollover_out)

    # 6. Update physical bill status
    # Before closing, it MUST remain "open" as per user request ("so vai pra pago depois do fechamento")
    # After closing, it's "paid" if it was fully settled or if rollover handled the difference
    if payment_date < closing_date:
        new_status = "open"
    else:
        new_status = "paid" # Fully settled or rolled over
    
    if bill_id.startswith("v_"):
        # For virtual bills, we already created the doc with status "paid" above. 
        # But let's fix it if it was an advance.
        await bills_collection.update_one(
            {"_id": bill["_id"]},
            {"$set": {"status": new_status}}
        )
    else:
        await bills_collection.update_one(
            {"_id": ObjectId(bill_id)}, 
            {"$set": {"status": new_status, "paid_at": payment_date, "amount": amount_to_pay}}
        )
    
    return {"message": "Fatura paga com sucesso", "bill_id": str(bill["_id"])}
