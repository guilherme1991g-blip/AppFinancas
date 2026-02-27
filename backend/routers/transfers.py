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
        "to_account_id": str(doc["to_account_id"]) if doc.get("to_account_id") else None,
        "to_sonho_id": str(doc["to_sonho_id"]) if doc.get("to_sonho_id") else None,
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
    if not from_acc:
        raise HTTPException(status_code=404, detail="Conta de origem não encontrada")
    
    if from_acc["type"] == "credit_card":
         raise HTTPException(status_code=400, detail="Transferências não são permitidas de cartões de crédito")

    if from_acc["balance"] < data.amount:
        raise HTTPException(status_code=400, detail="Saldo insuficiente na conta de origem")

    destination_id = None
    is_to_sonho = False

    if data.to_account_id:
        to_acc = await accounts_collection.find_one({"_id": ObjectId(data.to_account_id), "user_id": current_user["_id"]})
        if not to_acc:
            raise HTTPException(status_code=404, detail="Conta de destino não encontrada")
        if to_acc["type"] == "credit_card":
            raise HTTPException(status_code=400, detail="Transferências não são permitidas para cartões de crédito")
        destination_id = ObjectId(data.to_account_id)
    elif data.to_sonho_id:
        from database import sonhos_collection
        sonho = await sonhos_collection.find_one({"_id": ObjectId(data.to_sonho_id), "user_id": str(current_user["_id"])})
        if not sonho:
            raise HTTPException(status_code=404, detail="Objetivo não encontrado")
        destination_id = ObjectId(data.to_sonho_id)
        is_to_sonho = True
    else:
        raise HTTPException(status_code=400, detail="Destino não informado")

    doc = {
        **data.dict(),
        "from_account_id": ObjectId(data.from_account_id),
        "to_account_id": destination_id if not is_to_sonho else None,
        "to_sonho_id": destination_id if is_to_sonho else None,
        "user_id": current_user["_id"],
        "created_at": datetime.utcnow()
    }
    result = await transfers_collection.insert_one(doc)
    
    # Update Source
    await accounts_collection.update_one({"_id": ObjectId(data.from_account_id)}, {"$inc": {"balance": -data.amount}})
    
    # Update Destination
    if not is_to_sonho:
        await accounts_collection.update_one({"_id": destination_id}, {"$inc": {"balance": data.amount}})
    else:
        from database import sonhos_collection
        await sonhos_collection.update_one({"_id": destination_id}, {"$inc": {"current_amount": data.amount}, "$set": {"updated_at": datetime.utcnow()}})
    
    doc["_id"] = result.inserted_id
    return tf_doc(doc)


@router.delete("/{transfer_id}")
async def delete_transfer(transfer_id: str, current_user=Depends(get_current_user)):
    doc = await transfers_collection.find_one({"_id": ObjectId(transfer_id), "user_id": current_user["_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Transferência não encontrada")
    
    # Reverse Source
    await accounts_collection.update_one({"_id": doc["from_account_id"]}, {"$inc": {"balance": doc["amount"]}})
    
    # Reverse Destination
    if doc.get("to_account_id"):
        await accounts_collection.update_one({"_id": doc["to_account_id"]}, {"$inc": {"balance": -doc["amount"]}})
    elif doc.get("to_sonho_id"):
        from database import sonhos_collection
        await sonhos_collection.update_one({"_id": doc["to_sonho_id"]}, {"$inc": {"current_amount": -doc["amount"]}, "$set": {"updated_at": datetime.utcnow()}})
        
    await transfers_collection.delete_one({"_id": ObjectId(transfer_id)})
    return {"message": "Transferência removida"}
