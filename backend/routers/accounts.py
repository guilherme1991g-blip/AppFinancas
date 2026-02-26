from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from database import accounts_collection
from models.account import AccountCreate, AccountUpdate, AccountResponse
from routers.auth import get_current_user

router = APIRouter(prefix="/accounts", tags=["accounts"])


def account_doc(doc) -> dict:
    return {
        "id": str(doc["_id"]),
        "user_id": str(doc["user_id"]),
        "name": doc.get("name") or "Sem Nome",
        "type": doc["type"],
        "bank": doc.get("bank"),
        "balance": doc["balance"],
        "color": doc.get("color", "#00D09C"),
        "icon": doc.get("icon", "wallet"),
        "company_id": str(doc["company_id"]) if doc.get("company_id") else None,
        # Credit card fields
        "credit_limit": doc.get("credit_limit"),
        "closing_day": doc.get("closing_day"),
        "due_day": doc.get("due_day"),
        "last_digits": doc.get("last_digits"),
        "card_brand": doc.get("card_brand"),
        "card_holder": doc.get("card_holder"),
    }


@router.get("")
async def list_accounts(current_user=Depends(get_current_user)):
    docs = await accounts_collection.find({"user_id": current_user["_id"]}).to_list(length=100)
    return [account_doc(d) for d in docs]


@router.post("")
async def create_account(data: AccountCreate, current_user=Depends(get_current_user)):
    name = data.name
    if not name and data.type == "credit_card":
        brand = (data.card_brand or "Cartão").capitalize()
        bank = f" {data.bank}" if data.bank else ""
        digits = f" {data.last_digits}" if data.last_digits else ""
        name = f"{brand}{bank}{digits}"
    
    if not name:
        name = "Nova Conta"

    doc = {
        **data.dict(),
        "name": name,
        "user_id": current_user["_id"],
        "company_id": ObjectId(data.company_id) if data.company_id else None,
        "created_at": datetime.utcnow()
    }
    result = await accounts_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return account_doc(doc)


@router.put("/{account_id}")
async def update_account(account_id: str, data: AccountUpdate, current_user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    
    # 1. Fetch old account state to detect changes
    old_acc = await accounts_collection.find_one({"_id": ObjectId(account_id), "user_id": current_user["_id"]})
    if not old_acc:
        raise HTTPException(status_code=404, detail="Conta não encontrada")

    # 2. Check if billing days changed
    closing_changed = "closing_day" in update_data and update_data["closing_day"] != old_acc.get("closing_day")
    due_changed = "due_day" in update_data and update_data["due_day"] != old_acc.get("due_day")

    # 3. Apply update
    await accounts_collection.update_one(
        {"_id": ObjectId(account_id), "user_id": current_user["_id"]},
        {"$set": update_data}
    )
    
    # 4. Sync transactions if days changed
    if closing_changed or due_changed:
        from database import transactions_collection
        from utils.date_utils import calculate_due_date
        
        new_closing = update_data.get("closing_day", old_acc.get("closing_day", 10))
        new_due = update_data.get("due_day", old_acc.get("due_day", 17))
        
        # We only sync UNPAID transactions. Paid ones are already fixed in a bill.
        cursor = transactions_collection.find({
            "account_id": ObjectId(account_id),
            "is_paid": False
        })
        
        async for tx in cursor:
            new_due_date = calculate_due_date(tx["date"], new_closing, new_due)
            await transactions_collection.update_one(
                {"_id": tx["_id"]},
                {"$set": {"due_date": new_due_date}}
            )

    doc = await accounts_collection.find_one({"_id": ObjectId(account_id)})
    return account_doc(doc)


@router.delete("/{account_id}")
async def delete_account(account_id: str, current_user=Depends(get_current_user)):
    from database import transactions_collection, transfers_collection, recurring_collection
    
    obj_id = ObjectId(account_id)
    user_id = current_user["_id"]
    
    # Cascade deletion to transactions
    await transactions_collection.delete_many({
        "user_id": user_id,
        "$or": [{"account_id": obj_id}, {"to_account_id": obj_id}]
    })
        
    # Cascade deletion to transfers
    await transfers_collection.delete_many({
        "user_id": user_id,
        "$or": [{"from_account_id": obj_id}, {"to_account_id": obj_id}]
    })

    # Cascade deletion to recurring transactions
    await recurring_collection.delete_many({
        "user_id": user_id,
        "account_id": obj_id
    })

    result = await accounts_collection.delete_one(
        {"_id": obj_id, "user_id": user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return {"message": "Conta removida"}
