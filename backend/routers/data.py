from fastapi import APIRouter, Depends, HTTPException
from database import (
    users_collection, accounts_collection, categories_collection,
    transactions_collection, transfers_collection, budgets_collection,
    recurring_collection, companies_collection, bills_collection,
    sonhos_collection, compromissos_collection
)
from routers.auth import get_current_user
from bson import ObjectId
import json
from datetime import datetime

router = APIRouter(prefix="/data", tags=["data"])

@router.get("/export")
async def export_data(current_user=Depends(get_current_user)):
    user_id_obj = current_user["_id"]
    user_id_str = str(user_id_obj)
    
    # helper to convert BSON to JSON serializable
    def clean(docs):
        if isinstance(docs, list):
            return [clean(doc) for doc in docs]
        if isinstance(docs, dict):
            new_doc = {}
            for k, v in docs.items():
                if isinstance(v, ObjectId):
                    new_doc[k] = str(v)
                elif isinstance(v, datetime):
                    new_doc[k] = v.isoformat()
                elif isinstance(v, (dict, list)):
                    new_doc[k] = clean(v)
                else:
                    new_doc[k] = v
            return new_doc
        return docs

    async def get_safe(coll, query, limit=1000, as_string=False):
        try:
            return clean(await coll.find(query).to_list(limit))
        except Exception as e:
            print(f"Error exporting collection: {e}")
            return []

    data = {
        "accounts": await get_safe(accounts_collection, {"user_id": user_id_obj}),
        "categories": await get_safe(categories_collection, {"user_id": user_id_obj}),
        "transactions": await get_safe(transactions_collection, {"user_id": user_id_obj}, 10000),
        "transfers": await get_safe(transfers_collection, {"user_id": user_id_obj}),
        "budgets": await get_safe(budgets_collection, {"user_id": user_id_obj}),
        "recurring": await get_safe(recurring_collection, {"user_id": user_id_obj}),
        "companies": await get_safe(companies_collection, {"user_id": user_id_obj}),
        "bills": await get_safe(bills_collection, {"user_id": user_id_obj}),
        "sonhos": await get_safe(sonhos_collection, {"user_id": user_id_str}),
        "compromissos": await get_safe(compromissos_collection, {"user_id": user_id_str}),
    }
    
    return data

@router.post("/import")
async def import_data(data: dict, current_user=Depends(get_current_user)):
    user_id_obj = current_user["_id"]
    user_id_str = str(user_id_obj)
    
    # 1. Clear existing data
    await accounts_collection.delete_many({"user_id": user_id_obj})
    await categories_collection.delete_many({"user_id": user_id_obj})
    await transactions_collection.delete_many({"user_id": user_id_obj})
    await transfers_collection.delete_many({"user_id": user_id_obj})
    await budgets_collection.delete_many({"user_id": user_id_obj})
    await recurring_collection.delete_many({"user_id": user_id_obj})
    await companies_collection.delete_many({"user_id": user_id_obj})
    await bills_collection.delete_many({"user_id": user_id_obj})
    await sonhos_collection.delete_many({"user_id": user_id_str})
    await compromissos_collection.delete_many({"user_id": user_id_str})
    
    # 2. Insert new data
    # Helper to fix IDs and dates
    def prepare(docs, as_string=False):
        if not docs: return []
        new_docs = []
        for doc in docs:
            d = dict(doc)
            if "_id" in d: del d["_id"] # generate new ones
            d["user_id"] = user_id_str if as_string else user_id_obj
            for k, v in d.items():
                if isinstance(v, str) and (k.endswith("_at") or k == "date" or k == "due_date"):
                    try: d[k] = datetime.fromisoformat(v)
                    except: pass
            new_docs.append(d)
        return new_docs

    async def safe_insert(coll, docs, as_string=False):
        prepared = prepare(docs, as_string)
        if prepared:
            await coll.insert_many(prepared)

    await safe_insert(accounts_collection, data.get("accounts", []))
    await safe_insert(categories_collection, data.get("categories", []))
    await safe_insert(transactions_collection, data.get("transactions", []))
    await safe_insert(transfers_collection, data.get("transfers", []))
    await safe_insert(budgets_collection, data.get("budgets", []))
    await safe_insert(recurring_collection, data.get("recurring", []))
    await safe_insert(companies_collection, data.get("companies", []))
    await safe_insert(bills_collection, data.get("bills", []))
    await safe_insert(sonhos_collection, data.get("sonhos", []), True)
    await safe_insert(compromissos_collection, data.get("compromissos", []), True)
    
    return {"message": "Dados importados com sucesso"}
