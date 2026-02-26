from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from database import transfers_collection, accounts_collection
from models.transfer import TransferCreate
from routers.auth import get_current_user

router = APIRouter(prefix="/transfers", tags=["transfers"])


def tf_doc(doc) -> dict:
    return {
        "id": str(doc["_id"]),
        "user_id": str(doc["user_id"]),
        "from_account_id": str(doc["from_account_id"]),
        "to_account_id": str(doc["to_account_id"]),
        "amount": doc["amount"],
        "description": doc["description"],
        "date": doc["date"],
        "notes": doc.get("notes", ""),
        "created_at": doc["created_at"]
    }


@router.get("")
async def list_transfers(current_user=Depends(get_current_user)):
    docs = await transfers_collection.find({"user_id": current_user["_id"]}).sort("date", -1).to_list(100)
    return [tf_doc(d) for d in docs]


@router.post("")
async def create_transfer(data: TransferCreate, current_user=Depends(get_current_user)):
    from_acc = await accounts_collection.find_one({"_id": ObjectId(data.from_account_id), "user_id": current_user["_id"]})
    to_acc = await accounts_collection.find_one({"_id": ObjectId(data.to_account_id), "user_id": current_user["_id"]})
    if not from_acc or not to_acc:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    if from_acc["type"] == "credit_card" or to_acc["type"] == "credit_card":
        raise HTTPException(status_code=400, detail="Transferências não são permitidas para cartões de crédito")
    if from_acc["balance"] < data.amount:
        raise HTTPException(status_code=400, detail="Saldo insuficiente")
    doc = {
        **data.dict(),
        "from_account_id": ObjectId(data.from_account_id),
        "to_account_id": ObjectId(data.to_account_id),
        "user_id": current_user["_id"],
        "created_at": datetime.utcnow()
    }
    result = await transfers_collection.insert_one(doc)
    await accounts_collection.update_one({"_id": ObjectId(data.from_account_id)}, {"$inc": {"balance": -data.amount}})
    await accounts_collection.update_one({"_id": ObjectId(data.to_account_id)}, {"$inc": {"balance": data.amount}})
    doc["_id"] = result.inserted_id
    return tf_doc(doc)


@router.delete("/{transfer_id}")
async def delete_transfer(transfer_id: str, current_user=Depends(get_current_user)):
    doc = await transfers_collection.find_one({"_id": ObjectId(transfer_id), "user_id": current_user["_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Transferência não encontrada")
    await accounts_collection.update_one({"_id": doc["from_account_id"]}, {"$inc": {"balance": doc["amount"]}})
    await accounts_collection.update_one({"_id": doc["to_account_id"]}, {"$inc": {"balance": -doc["amount"]}})
    await transfers_collection.delete_one({"_id": ObjectId(transfer_id)})
    return {"message": "Transferência removida"}
