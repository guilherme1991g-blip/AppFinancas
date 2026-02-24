from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from database import budgets_collection, transactions_collection
from models.meta import MetaCreate, MetaUpdate
from routers.auth import get_current_user

router = APIRouter(prefix="/metas", tags=["metas"])


async def calc_spent(user_id, category_id, month, year) -> float:
    start = datetime(year, month, 1)
    # Correctly handle next month for end date
    if month == 12:
        end = datetime(year + 1, 1, 1)
    else:
        end = datetime(year, month + 1, 1)
        
    pipeline = [
        {"$match": {"user_id": user_id, "category_id": category_id, "type": "expense", "date": {"$gte": start, "$lt": end}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    result = await transactions_collection.aggregate(pipeline).to_list(1)
    return result[0]["total"] if result else 0.0


def meta_doc(doc, spent=0.0) -> dict:
    return {
        "id": str(doc["_id"]),
        "user_id": str(doc["user_id"]),
        "category_id": str(doc["category_id"]),
        "amount": doc["amount"],
        "month": doc["month"],
        "year": doc["year"],
        "spent": spent,
        "company_id": str(doc["company_id"]) if doc.get("company_id") else None,
        "created_at": doc["created_at"]
    }


@router.get("")
async def list_metas(month: int = None, year: int = None, current_user=Depends(get_current_user)):
    query = {"user_id": current_user["_id"]}
    if month:
        query["month"] = month
    if year:
        query["year"] = year
    docs = await budgets_collection.find(query).to_list(100)
    result = []
    for d in docs:
        spent = await calc_spent(current_user["_id"], d["category_id"], d["month"], d["year"])
        result.append(meta_doc(d, spent))
    return result


@router.post("")
async def create_meta(data: MetaCreate, current_user=Depends(get_current_user)):
    doc = {
        **data.dict(),
        "category_id": ObjectId(data.category_id),
        "company_id": ObjectId(data.company_id) if data.company_id else None,
        "user_id": current_user["_id"],
        "created_at": datetime.utcnow()
    }
    result = await budgets_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    spent = await calc_spent(current_user["_id"], doc["category_id"], data.month, data.year)
    return meta_doc(doc, spent)


@router.put("/{meta_id}")
async def update_meta(meta_id: str, data: MetaUpdate, current_user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    await budgets_collection.update_one(
        {"_id": ObjectId(meta_id), "user_id": current_user["_id"]},
        {"$set": update_data}
    )
    doc = await budgets_collection.find_one({"_id": ObjectId(meta_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    spent = await calc_spent(current_user["_id"], doc["category_id"], doc["month"], doc["year"])
    return meta_doc(doc, spent)


@router.delete("/{meta_id}")
async def delete_meta(meta_id: str, current_user=Depends(get_current_user)):
    await budgets_collection.delete_one({"_id": ObjectId(meta_id), "user_id": current_user["_id"]})
    return {"message": "Meta removida"}
