import os
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from database import users_collection, transactions_collection, db
from routers.auth import get_current_user
from models.user import UserResponse

router = APIRouter(prefix="/admin", tags=["admin"])

async def get_admin_user(current_user=Depends(get_current_user)):
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Acesso negado: Requer privilégios de administrador")
    return current_user

@router.get("/stats")
async def get_stats(admin_user=Depends(get_admin_user)):
    total_users = await users_collection.count_documents({})
    total_transactions = await transactions_collection.count_documents({})
    
    # Simple aggregation for total volume
    pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    result = await transactions_collection.aggregate(pipeline).to_list(1)
    total_volume = result[0]["total"] if result else 0
    
    # Active users in last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    # Note: Using created_at as a proxy if last_login isn't available
    active_users = await users_collection.count_documents({"created_at": {"$gte": thirty_days_ago}})

    return {
        "total_users": total_users,
        "total_transactions": total_transactions,
        "total_volume": float(total_volume),
        "active_users_recent": active_users
    }

@router.get("/users", response_model=List[UserResponse])
async def list_users(limit: int = 50, skip: int = 0, admin_user=Depends(get_admin_user)):
    users = await users_collection.find().skip(skip).limit(limit).to_list(limit)
    return [
        UserResponse(
            id=str(u["_id"]),
            name=u.get("name", ""),
            email=u.get("email", ""),
            is_admin=u.get("is_admin", False),
            phone=u.get("phone"),
            ddi=u.get("ddi"),
            cpf=u.get("cpf"),
            is_brazilian=u.get("is_brazilian"),
            cep=u.get("cep"),
            city=u.get("city"),
            state=u.get("state"),
            address=u.get("address"),
            birth_date=u.get("birth_date"),
            education=u.get("education"),
            occupation=u.get("occupation"),
            salary_range=u.get("salary_range"),
            housing_type=u.get("housing_type"),
            household_size=u.get("household_size"),
            has_vehicle=u.get("has_vehicle"),
            vehicle_type=u.get("vehicle_type"),
            equity=u.get("equity"),
            created_at=u["created_at"]
        ) for u in users
    ]

@router.patch("/users/{user_id}/role")
async def update_user_role(user_id: str, is_admin: bool, admin_user=Depends(get_admin_user)):
    if user_id == str(admin_user["_id"]) and not is_admin:
        raise HTTPException(status_code=400, detail="Não é possível remover seus próprios privilégios de administrador")
    
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_admin": is_admin}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    return {"message": f"Usuário {'promovido a' if is_admin else 'removido de'} administrador"}

@router.get("/transactions")
async def monitor_transactions(limit: int = 100, admin_user=Depends(get_admin_user)):
    # Get recent transactions across all users
    transactions = await transactions_collection.find().sort("date", -1).limit(limit).to_list(limit)
    
    # Enrich with user info
    enriched = []
    for t in transactions:
        user = await users_collection.find_one({"_id": t.get("user_id") if isinstance(t.get("user_id"), ObjectId) else ObjectId(t.get("user_id"))})
        t["user_name"] = user.get("name") if user else "Desconhecido"
        t["_id"] = str(t["_id"])
        if "user_id" in t:
            t["user_id"] = str(t["user_id"])
        enriched.append(t)
        
    return enriched
