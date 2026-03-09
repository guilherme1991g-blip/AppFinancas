"""
Helpers para verificação de limites de plano.
Inclui resolução de plano efetivo (expiração, admin, trial).
"""
from datetime import datetime, timedelta
from database import users_collection, accounts_collection, transactions_collection, compromissos_collection
from models.user import PLAN_LIMITS
from fastapi import HTTPException
from bson import ObjectId


def get_effective_plan(user: dict) -> str:
    """
    Retorna o plano efetivo do usuário considerando:
    - Admin nunca expira
    - Planos pagos (basic/premium) expiram em plan_expires_at
    - Trial expira em trial_expires_at
    """
    # Admin sempre mantém o plano
    if user.get("is_admin"):
        return user.get("plan", "free")

    stored_plan = user.get("plan", "free")
    now = datetime.utcnow()

    # Verificar trial ativo
    trial_expires = user.get("trial_expires_at")
    if trial_expires and trial_expires > now:
        return "premium"  # trial ativo = premium

    # Verificar expiração de plano pago
    if stored_plan in ("basic", "premium"):
        plan_expires = user.get("plan_expires_at")
        if plan_expires and plan_expires <= now:
            return "free"  # expirado → cai para free

    return stored_plan


def get_plan_limits(user: dict) -> dict:
    """Retorna os limites do plano efetivo do usuário."""
    plan = get_effective_plan(user)
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])


def get_plan_info(user: dict) -> dict:
    """Retorna informações completas do plano para o frontend."""
    effective = get_effective_plan(user)
    limits = PLAN_LIMITS.get(effective, PLAN_LIMITS["free"])
    now = datetime.utcnow()

    info = {
        "plan": effective,
        "plan_limits": limits,
        "stored_plan": user.get("plan", "free"),
        "is_admin": user.get("is_admin", False),
        "trial_used": user.get("trial_used", False),
    }

    # Trial info
    trial_expires = user.get("trial_expires_at")
    if trial_expires and trial_expires > now:
        info["trial_active"] = True
        info["trial_expires_at"] = trial_expires.isoformat()
        info["trial_days_left"] = max(0, (trial_expires - now).days)
    else:
        info["trial_active"] = False

    # Plan expiration info
    plan_expires = user.get("plan_expires_at")
    if plan_expires:
        info["plan_expires_at"] = plan_expires.isoformat()
        if plan_expires > now:
            info["plan_days_left"] = max(0, (plan_expires - now).days)
        else:
            info["plan_expired"] = True

    return info


async def check_account_limit(user_id, account_type: str):
    """Verifica se o usuário pode criar mais uma conta ou cartão."""
    user = await users_collection.find_one({"_id": user_id})
    limits = get_plan_limits(user)
    effective = get_effective_plan(user)

    if account_type == "credit_card":
        max_allowed = limits["max_credit_cards"]
        current = await accounts_collection.count_documents({
            "user_id": user_id,
            "type": "credit_card"
        })
        if current >= max_allowed:
            if max_allowed == 0:
                raise HTTPException(
                    status_code=403,
                    detail="Este recurso é exclusivo do Premium. Faça upgrade para desbloquear!"
                )
            raise HTTPException(
                status_code=403,
                detail=f"Limite de cartões de crédito atingido ({current}/{max_allowed}). Faça upgrade para o Premium para adicionar mais."
            )
    else:
        max_allowed = limits["max_accounts"]
        current = await accounts_collection.count_documents({
            "user_id": user_id,
            "type": {"$ne": "credit_card"}
        })
        if current >= max_allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Limite de contas atingido ({current}/{max_allowed}). Faça upgrade para o Premium para adicionar mais."
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
        raise HTTPException(
            status_code=403,
            detail=f"Limite de transações do mês atingido ({current}/{max_tx}). Faça upgrade para o Premium para transações ilimitadas."
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
        raise HTTPException(
            status_code=403,
            detail=f"Limite de agendamentos atingido ({current}/{max_ag}). Faça upgrade para o Premium para agendamentos ilimitados."
        )
