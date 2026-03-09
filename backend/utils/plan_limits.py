"""
Helpers para verificação de limites de plano.
"""
from datetime import datetime
from database import users_collection, accounts_collection, transactions_collection, compromissos_collection
from models.user import PLAN_LIMITS
from fastapi import HTTPException
from bson import ObjectId


def get_plan_limits(user: dict) -> dict:
    """Retorna os limites do plano do usuário."""
    plan = user.get("plan", "free")
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])


async def check_account_limit(user_id, account_type: str):
    """Verifica se o usuário pode criar mais uma conta ou cartão."""
    user = await users_collection.find_one({"_id": user_id})
    limits = get_plan_limits(user)

    if account_type == "credit_card":
        max_allowed = limits["max_credit_cards"]
        current = await accounts_collection.count_documents({
            "user_id": user_id,
            "type": "credit_card"
        })
        if current >= max_allowed:
            plan = user.get("plan", "free")
            if max_allowed == 0:
                raise HTTPException(
                    status_code=403,
                    detail=f"Seu plano ({plan}) não permite cartões de crédito. Faça upgrade para desbloquear este recurso."
                )
            raise HTTPException(
                status_code=403,
                detail=f"Limite de cartões de crédito atingido ({current}/{max_allowed}). Faça upgrade do seu plano para adicionar mais."
            )
    else:
        max_allowed = limits["max_accounts"]
        current = await accounts_collection.count_documents({
            "user_id": user_id,
            "type": {"$ne": "credit_card"}
        })
        if current >= max_allowed:
            plan = user.get("plan", "free")
            raise HTTPException(
                status_code=403,
                detail=f"Limite de contas atingido ({current}/{max_allowed}). Faça upgrade do seu plano para adicionar mais."
            )


async def check_transaction_limit(user_id):
    """Verifica se o usuário pode criar mais transações neste mês."""
    user = await users_collection.find_one({"_id": user_id})
    limits = get_plan_limits(user)
    max_tx = limits["max_transactions_month"]

    if max_tx >= 99999:
        return  # ilimitado

    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    if now.month == 12:
        month_end = datetime(now.year + 1, 1, 1)
    else:
        month_end = datetime(now.year, now.month + 1, 1)

    current = await transactions_collection.count_documents({
        "user_id": user_id,
        "date": {"$gte": month_start, "$lt": month_end}
    })

    if current >= max_tx:
        plan = user.get("plan", "free")
        raise HTTPException(
            status_code=403,
            detail=f"Limite de transações do mês atingido ({current}/{max_tx}). Faça upgrade do seu plano para transações ilimitadas."
        )


async def check_agendamento_limit(user_id):
    """Verifica se o usuário pode criar mais agendamentos."""
    user = await users_collection.find_one({"_id": user_id})
    limits = get_plan_limits(user)
    max_ag = limits["max_agendamentos"]

    if max_ag >= 99999:
        return  # ilimitado

    current = await compromissos_collection.count_documents({
        "user_id": str(user_id) if isinstance(user_id, ObjectId) else user_id
    })

    if current >= max_ag:
        plan = user.get("plan", "free")
        raise HTTPException(
            status_code=403,
            detail=f"Limite de agendamentos atingido ({current}/{max_ag}). Faça upgrade do seu plano para agendamentos ilimitados."
        )
