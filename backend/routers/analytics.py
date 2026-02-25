from fastapi import APIRouter, Depends, Query
from bson import ObjectId
from datetime import datetime
from typing import Optional
from database import transactions_collection, accounts_collection, categories_collection, bills_collection
from routers.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
async def get_summary(
    month: Optional[int] = None,
    year: Optional[int] = None,
    company_id: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year
    start = datetime(y, m, 1)
    end = datetime(y, m + 1, 1) if m < 12 else datetime(y + 1, 1, 1)

    # Identify credit card accounts to exclude their individual transactions
    accounts = await accounts_collection.find({"user_id": current_user["_id"]}).to_list(100)
    cc_account_ids = [acc["_id"] for acc in accounts if acc["type"] == "credit_card"]
    
    query = {
        "user_id": current_user["_id"], 
        "date": {"$gte": start, "$lt": end},
        "account_id": {"$nin": cc_account_ids}
    }
    if company_id:
        query["company_id"] = ObjectId(company_id)

    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": {"type": "$type", "is_paid": {"$ifNull": ["$is_paid", True]}},
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }}
    ]
    result = await transactions_collection.aggregate(pipeline).to_list(20)
    
    income_paid = 0
    income_pending = 0
    expense_paid = 0
    tx_expense_pending = 0
    income_count = 0
    expense_count = 0

    for r in result:
        t = r["_id"]["type"]
        p = r["_id"]["is_paid"]
        if t == "income":
            income_count += r["count"]
            if p: income_paid += r["total"]
            else: income_pending += r["total"]
        else:
            expense_count += r["count"]
            if p: expense_paid += r["total"]
            else: tx_expense_pending += r["total"]

    # Calculate bill totals
    bill_expense_paid = 0
    bill_expense_pending = 0
    cc_details = []
    
    for acc in accounts:
        if acc["type"] == "credit_card":
            # Check for explicitly created bill
            bill = await bills_collection.find_one({
                "account_id": acc["_id"],
                "month": m,
                "year": y
            })
            
            bill_total = 0
            if bill:
                bill_total = bill["amount"]
                if bill["status"] == "paid":
                    bill_expense_paid += bill["amount"]
                else:
                    bill_expense_pending += bill["amount"]
            else:
                # Calculate virtual bill for this specific month/year
                cc_tx_query = {
                    "account_id": acc["_id"],
                    "due_date": {"$gte": start, "$lt": end}
                }
                async for tx in transactions_collection.find(cc_tx_query):
                    bill_total += tx["amount"]
                
                bill_expense_pending += bill_total

            cc_details.append({
                "account_id": str(acc["_id"]),
                "bill_total": bill_total,
                "status": bill["status"] if bill else "open"
            })

    total_balance = sum(a["balance"] for a in accounts)
    
    # Balance for the month
    month_balance = (income_paid + income_pending) - (expense_paid + bill_expense_paid + tx_expense_pending + bill_expense_pending)
 
    return {
        "month": m,
        "year": y,
        "income": income_paid,
        "expense": expense_paid + bill_expense_paid,
        "pending_income": income_pending,
        "pending_expense": tx_expense_pending + bill_expense_pending,
        "balance": month_balance,
        "total_balance": total_balance,
        # Forecast is current Net Worth + expected surplus/deficit of pending items.
        # Since card transactions already updated 'total_balance', we only add pending non-card items.
        "forecast": total_balance + income_pending - tx_expense_pending,
        "income_count": income_count,
        "expense_count": expense_count,
        "credit_cards": cc_details
    }


@router.get("/by-category")
async def get_by_category(
    month: Optional[int] = None,
    year: Optional[int] = None,
    type: str = "expense",
    is_paid: Optional[bool] = None,
    company_id: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year
    start = datetime(y, m, 1)
    # Ensure next month logic is robust
    if m == 12:
        end = datetime(y + 1, 1, 1)
    else:
        end = datetime(y, m + 1, 1)

    # Identify credit card accounts to exclude
    accounts = await accounts_collection.find({"user_id": current_user["_id"]}).to_list(100)
    cc_account_ids = [acc["_id"] for acc in accounts if acc["type"] == "credit_card"]

    query = {
        "user_id": current_user["_id"], 
        "type": type, 
        "date": {"$gte": start, "$lt": end},
        "account_id": {"$nin": cc_account_ids}
    }
    if is_paid is not None:
        query["is_paid"] = is_paid
    if company_id:
        query["company_id"] = ObjectId(company_id)

    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$category_id", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}}
    ]
    result = await transactions_collection.aggregate(pipeline).to_list(50)

    enriched = []
    for r in result:
        cat = await categories_collection.find_one({"_id": r["_id"]})
        enriched.append({
            "category_id": str(r["_id"]),
            "category_name": cat["name"] if cat else "Sem categoria",
            "category_color": cat.get("color", "#636E72") if cat else "#636E72",
            "category_icon": cat.get("icon", "tag") if cat else "tag",
            "total": r["total"],
            "count": r["count"]
        })
    return enriched


@router.get("/cashflow")
async def get_cashflow(year: Optional[int] = None, company_id: Optional[str] = None, current_user=Depends(get_current_user)):
    y = year or datetime.utcnow().year
    start = datetime(y, 1, 1)
    end = datetime(y + 1, 1, 1)

    query = {"user_id": current_user["_id"], "date": {"$gte": start, "$lt": end}}
    if company_id:
        query["company_id"] = ObjectId(company_id)

    pipeline = [
        {"$match": query},
        {"$group": {"_id": {"month": {"$month": "$date"}, "type": "$type"}, "total": {"$sum": "$amount"}}},
        {"$sort": {"_id.month": 1}}
    ]
    result = await transactions_collection.aggregate(pipeline).to_list(100)

    months_data = {i: {"month": i, "income": 0, "expense": 0} for i in range(1, 13)}
    for r in result:
        m = r["_id"]["month"]
        t = r["_id"]["type"]
        months_data[m][t] = r["total"]

    return list(months_data.values())


@router.get("/dre")
async def get_dre(
    month: Optional[int] = None,
    year: Optional[int] = None,
    company_id: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year
    start = datetime(y, m, 1)
    end = datetime(y, m + 1, 1) if m < 12 else datetime(y + 1, 1, 1)

    query = {"user_id": current_user["_id"], "date": {"$gte": start, "$lt": end}}
    if company_id:
        query["company_id"] = ObjectId(company_id)

    pipeline = [
        {"$match": query},
        {"$group": {"_id": {"type": "$type", "category_id": "$category_id"}, "total": {"$sum": "$amount"}}},
        {"$sort": {"total": -1}}
    ]
    result = await transactions_collection.aggregate(pipeline).to_list(100)

    receitas = []
    despesas = []
    total_receita = 0
    total_despesa = 0

    for r in result:
        cat = await categories_collection.find_one({"_id": r["_id"]["category_id"]})
        item = {
            "category": cat["name"] if cat else "Sem categoria",
            "color": cat.get("color", "#636E72") if cat else "#636E72",
            "total": r["total"]
        }
        if r["_id"]["type"] == "income":
            receitas.append(item)
            total_receita += r["total"]
        else:
            despesas.append(item)
            total_despesa += r["total"]

    return {
        "month": m, "year": y,
        "receitas": receitas,
        "despesas": despesas,
        "total_receita": total_receita,
        "total_despesa": total_despesa,
        "resultado": total_receita - total_despesa
    }
