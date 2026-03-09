import os
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from database import users_collection, transactions_collection, accounts_collection, db
from routers.auth import get_current_user
from models.user import UserResponse, PLAN_LIMITS

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
    active_users = await users_collection.count_documents({"created_at": {"$gte": thirty_days_ago}})

    # Plan distribution
    plan_stats = {}
    for plan in ["free", "basic", "premium"]:
        count = await users_collection.count_documents({"plan": plan})
        plan_stats[plan] = count
    # Users without plan field = free
    no_plan = await users_collection.count_documents({"plan": {"$exists": False}})
    plan_stats["free"] = plan_stats.get("free", 0) + no_plan

    return {
        "total_users": total_users,
        "total_transactions": total_transactions,
        "total_volume": float(total_volume),
        "active_users_recent": active_users,
        "plan_distribution": plan_stats
    }

def _build_user_response(u):
    return UserResponse(
        id=str(u["_id"]),
        name=u.get("name", ""),
        email=u.get("email", ""),
        is_admin=u.get("is_admin", False),
        plan=u.get("plan", "free"),
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
        created_at=u["created_at"],
        preferences=u.get("preferences"),
        push_token=u.get("push_token")
    )

@router.get("/users", response_model=List[UserResponse])
async def list_users(limit: int = 50, skip: int = 0, admin_user=Depends(get_admin_user)):
    users = await users_collection.find().skip(skip).limit(limit).to_list(limit)
    return [_build_user_response(u) for u in users]

@router.get("/users/{user_id}")
async def get_user_detail(user_id: str, admin_user=Depends(get_admin_user)):
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    user_oid = user["_id"]
    
    # Contagem de contas (não-cartão)
    total_accounts = await accounts_collection.count_documents({
        "user_id": user_oid,
        "type": {"$ne": "credit_card"}
    })
    
    # Contagem de cartões
    total_credit_cards = await accounts_collection.count_documents({
        "user_id": user_oid,
        "type": "credit_card"
    })
    
    # Contagem de transações do mês atual
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    if now.month == 12:
        month_end = datetime(now.year + 1, 1, 1)
    else:
        month_end = datetime(now.year, now.month + 1, 1)
    
    transactions_this_month = await transactions_collection.count_documents({
        "user_id": user_oid,
        "date": {"$gte": month_start, "$lt": month_end}
    })
    
    # Total de transações
    total_transactions = await transactions_collection.count_documents({"user_id": user_oid})
    
    plan = user.get("plan", "free")
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    
    user_data = _build_user_response(user).model_dump()
    user_data["usage"] = {
        "accounts": total_accounts,
        "credit_cards": total_credit_cards,
        "transactions_this_month": transactions_this_month,
        "total_transactions": total_transactions,
    }
    user_data["plan_limits"] = limits
    
    return user_data

@router.patch("/users/{user_id}/plan")
async def update_user_plan(user_id: str, plan: str = Query(..., enum=["free", "basic", "premium"]), admin_user=Depends(get_admin_user)):
    if plan not in PLAN_LIMITS:
        raise HTTPException(status_code=400, detail="Plano inválido")
    
    limits = PLAN_LIMITS[plan]
    
    # Atualizar plano e whatsapp_enabled de acordo
    update = {
        "$set": {
            "plan": plan,
            "preferences.whatsapp_enabled": limits["whatsapp_enabled"],
        }
    }
    
    result = await users_collection.update_one({"_id": ObjectId(user_id)}, update)
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    return {
        "message": f"Plano alterado para '{plan}' com sucesso",
        "plan": plan,
        "limits": limits
    }

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
