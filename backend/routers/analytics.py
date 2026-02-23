from fastapi import APIRouter, Depends, Query
from bson import ObjectId
from datetime import datetime
from typing import Optional
from database import transactions_collection, accounts_collection, categories_collection
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

    query = {"user_id": current_user["_id"], "date": {"$gte": start, "$lt": end}}
    if company_id:
        query["company_id"] = ObjectId(company_id)

    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$type", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    result = await transactions_collection.aggregate(pipeline).to_list(10)
    totals = {r["_id"]: {"total": r["total"], "count": r["count"]} for r in result}

    income = totals.get("income", {"total": 0, "count": 0})
    expense = totals.get("expense", {"total": 0, "count": 0})
    balance = income["total"] - expense["total"]

    # Total balance across all accounts
    accounts = await accounts_collection.find({"user_id": current_user["_id"]}).to_list(100)
    total_balance = sum(a["balance"] for a in accounts)

    return {
        "month": m,
        "year": y,
        "income": income["total"],
        "expense": expense["total"],
        "balance": balance,
        "total_balance": total_balance,
        "income_count": income["count"],
        "expense_count": expense["count"]
    }


@router.get("/by-category")
async def get_by_category(
    month: Optional[int] = None,
    year: Optional[int] = None,
    type: str = "expense",
    company_id: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year
    start = datetime(y, m, 1)
    end = datetime(y, m + 1, 1) if m < 12 else datetime(y + 1, 1, 1)

    query = {"user_id": current_user["_id"], "type": type, "date": {"$gte": start, "$lt": end}}
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
