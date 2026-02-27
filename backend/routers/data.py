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
        for doc in docs:
            if "_id" in doc: doc["_id"] = str(doc["_id"])
            if "user_id" in doc: doc["user_id"] = str(doc["user_id"])
            for k, v in doc.items():
                if isinstance(v, datetime):
                    doc[k] = v.isoformat()
        return docs

    data = {
        "accounts": clean(await accounts_collection.find({"user_id": user_id_obj}).to_list(1000)),
        "categories": clean(await categories_collection.find({"user_id": user_id_obj}).to_list(1000)),
        "transactions": clean(await transactions_collection.find({"user_id": user_id_obj}).to_list(10000)),
        "transfers": clean(await transfers_collection.find({"user_id": user_id_obj}).to_list(1000)),
        "budgets": clean(await budgets_collection.find({"user_id": user_id_obj}).to_list(1000)),
        "recurring": clean(await recurring_collection.find({"user_id": user_id_obj}).to_list(1000)),
        "companies": clean(await companies_collection.find({"user_id": user_id_obj}).to_list(1000)),
        "bills": clean(await bills_collection.find({"user_id": user_id_obj}).to_list(1000)),
        "sonhos": clean(await sonhos_collection.find({"user_id": user_id_str}).to_list(1000)),
        "compromissos": clean(await compromissos_collection.find({"user_id": user_id_str}).to_list(1000)),
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
        for doc in docs:
            if "_id" in doc: del doc["_id"] # generate new ones
            doc["user_id"] = user_id_str if as_string else user_id_obj
            for k, v in doc.items():
                if isinstance(v, str) and (k.endswith("_at") or k == "date" or k == "due_date"):
                    try: doc[k] = datetime.fromisoformat(v)
                    except: pass
        return docs

    if "accounts" in data: await accounts_collection.insert_many(prepare(data["accounts"]))
    if "categories" in data: await categories_collection.insert_many(prepare(data["categories"]))
    if "transactions" in data: await transactions_collection.insert_many(prepare(data["transactions"]))
    if "transfers" in data: await transfers_collection.insert_many(prepare(data["transfers"]))
    if "budgets" in data: await budgets_collection.insert_many(prepare(data["budgets"]))
    if "recurring" in data: await recurring_collection.insert_many(prepare(data["recurring"]))
    if "companies" in data: await companies_collection.insert_many(prepare(data["companies"]))
    if "bills" in data: await bills_collection.insert_many(prepare(data["bills"]))
    if "sonhos" in data: await sonhos_collection.insert_many(prepare(data["sonhos"], True))
    if "compromissos" in data: await compromissos_collection.insert_many(prepare(data["compromissos"], True))
    
    return {"message": "Dados importados com sucesso"}
