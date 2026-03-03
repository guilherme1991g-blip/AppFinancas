"""
API Externa — Endpoints públicos autenticados via API Key (header X-API-Key).
Habilitados/desabilitados pelo toggle WhatsApp nas preferências do usuário.
"""
from fastapi import APIRouter, HTTPException, Header, Query
from typing import Optional
from datetime import datetime
from bson import ObjectId
from database import (
    users_collection, accounts_collection, categories_collection,
    transactions_collection, bills_collection, compromissos_collection,
    recurring_collection
)

router = APIRouter(prefix="/v1", tags=["external_api"])


async def get_user_by_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    """Authenticate user via phone number (DDI+DDD+number)."""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key não fornecida")

    # Keep only digits (removes +, spaces, dashes)
    clean_key = "".join(c for c in x_api_key if c.isdigit())

    if len(clean_key) < 10:
        raise HTTPException(status_code=401, detail="API key inválida")

    user = await users_collection.find_one({"preferences.api_key": clean_key})
    if not user:
        raise HTTPException(status_code=401, detail="API key inválida")

    prefs = user.get("preferences", {})
    if not prefs.get("whatsapp_enabled", False):
        raise HTTPException(status_code=403, detail="API desabilitada. Ative o WhatsApp nas preferências.")

    return user


def _serialize(doc: dict) -> dict:
    """Convert ObjectId fields to strings for JSON serialization."""
    result = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            result[k] = str(v)
        elif isinstance(v, datetime):
            result[k] = v.isoformat()
        elif isinstance(v, dict):
            result[k] = _serialize(v)
        elif isinstance(v, list):
            result[k] = [_serialize(i) if isinstance(i, dict) else (str(i) if isinstance(i, ObjectId) else i) for i in v]
        else:
            result[k] = v
    return result


# ──────────────── CONTAS ────────────────
@router.get("/contas")
async def listar_contas(x_api_key: str = Header(..., alias="X-API-Key")):
    user = await get_user_by_api_key(x_api_key)
    docs = await accounts_collection.find({"user_id": user["_id"]}).to_list(100)
    return [_serialize(d) for d in docs]


# ──────────────── CARTÕES ────────────────
@router.get("/cartoes")
async def listar_cartoes(x_api_key: str = Header(..., alias="X-API-Key")):
    user = await get_user_by_api_key(x_api_key)
    docs = await accounts_collection.find({
        "user_id": user["_id"],
        "type": "credit_card"
    }).to_list(100)
    return [_serialize(d) for d in docs]


# ──────────────── CATEGORIAS ────────────────
@router.get("/categorias")
async def listar_categorias(x_api_key: str = Header(..., alias="X-API-Key")):
    user = await get_user_by_api_key(x_api_key)
    docs = await categories_collection.find({"user_id": user["_id"]}).to_list(200)
    return [_serialize(d) for d in docs]


# ──────────────── DESPESAS ────────────────
@router.get("/despesas")
async def listar_despesas(
    x_api_key: str = Header(..., alias="X-API-Key"),
    month: Optional[int] = None,
    year: Optional[int] = None,
    limit: int = Query(50, le=200)
):
    user = await get_user_by_api_key(x_api_key)
    query = {"user_id": user["_id"], "type": "expense"}

    if month and year:
        start = datetime(year, month, 1)
        nm = month + 1 if month < 12 else 1
        ny = year if month < 12 else year + 1
        end = datetime(ny, nm, 1)
        query["date"] = {"$gte": start, "$lt": end}

    docs = await transactions_collection.find(query).sort("date", -1).to_list(limit)
    return [_serialize(d) for d in docs]


@router.post("/despesas")
async def criar_despesa(
    data: dict,
    x_api_key: str = Header(..., alias="X-API-Key")
):
    user = await get_user_by_api_key(x_api_key)

    required = ["account_id", "category_id", "amount", "description"]
    for field in required:
        if field not in data:
            raise HTTPException(status_code=400, detail=f"Campo obrigatório: {field}")

    doc = {
        "user_id": user["_id"],
        "account_id": ObjectId(data["account_id"]),
        "category_id": ObjectId(data["category_id"]),
        "type": "expense",
        "amount": float(data["amount"]),
        "description": data["description"],
        "date": datetime.fromisoformat(data.get("date", datetime.utcnow().isoformat())),
        "notes": data.get("notes"),
        "tags": data.get("tags", []),
        "is_paid": data.get("is_paid", True),
        "created_at": datetime.utcnow()
    }

    result = await transactions_collection.insert_one(doc)

    # Update account balance
    if doc["is_paid"]:
        await accounts_collection.update_one(
            {"_id": doc["account_id"]},
            {"$inc": {"balance": -doc["amount"]}}
        )

    doc["_id"] = result.inserted_id
    return _serialize(doc)


# ──────────────── RECEITAS ────────────────
@router.get("/receitas")
async def listar_receitas(
    x_api_key: str = Header(..., alias="X-API-Key"),
    month: Optional[int] = None,
    year: Optional[int] = None,
    limit: int = Query(50, le=200)
):
    user = await get_user_by_api_key(x_api_key)
    query = {"user_id": user["_id"], "type": "income"}

    if month and year:
        start = datetime(year, month, 1)
        nm = month + 1 if month < 12 else 1
        ny = year if month < 12 else year + 1
        end = datetime(ny, nm, 1)
        query["date"] = {"$gte": start, "$lt": end}

    docs = await transactions_collection.find(query).sort("date", -1).to_list(limit)
    return [_serialize(d) for d in docs]


@router.post("/receitas")
async def criar_receita(
    data: dict,
    x_api_key: str = Header(..., alias="X-API-Key")
):
    user = await get_user_by_api_key(x_api_key)

    required = ["account_id", "category_id", "amount", "description"]
    for field in required:
        if field not in data:
            raise HTTPException(status_code=400, detail=f"Campo obrigatório: {field}")

    doc = {
        "user_id": user["_id"],
        "account_id": ObjectId(data["account_id"]),
        "category_id": ObjectId(data["category_id"]),
        "type": "income",
        "amount": float(data["amount"]),
        "description": data["description"],
        "date": datetime.fromisoformat(data.get("date", datetime.utcnow().isoformat())),
        "notes": data.get("notes"),
        "tags": data.get("tags", []),
        "is_paid": data.get("is_paid", True),
        "created_at": datetime.utcnow()
    }

    result = await transactions_collection.insert_one(doc)

    if doc["is_paid"]:
        await accounts_collection.update_one(
            {"_id": doc["account_id"]},
            {"$inc": {"balance": doc["amount"]}}
        )

    doc["_id"] = result.inserted_id
    return _serialize(doc)


# ──────────────── FATURAS ────────────────
@router.get("/faturas")
async def listar_faturas(
    x_api_key: str = Header(..., alias="X-API-Key"),
    month: Optional[int] = None,
    year: Optional[int] = None
):
    user = await get_user_by_api_key(x_api_key)
    query = {"user_id": user["_id"]}

    if month:
        query["month"] = month
    if year:
        query["year"] = year

    docs = await bills_collection.find(query).to_list(100)
    return [_serialize(d) for d in docs]


@router.post("/faturas")
async def lancar_fatura(
    data: dict,
    x_api_key: str = Header(..., alias="X-API-Key")
):
    """Lançar uma transação na fatura do cartão de crédito."""
    user = await get_user_by_api_key(x_api_key)

    required = ["account_id", "category_id", "amount", "description", "date"]
    for field in required:
        if field not in data:
            raise HTTPException(status_code=400, detail=f"Campo obrigatório: {field}")

    # Verificar se é cartão de crédito
    account = await accounts_collection.find_one({
        "_id": ObjectId(data["account_id"]),
        "user_id": user["_id"]
    })
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    if account.get("type") != "credit_card":
        raise HTTPException(status_code=400, detail="Esta conta não é um cartão de crédito")

    tx_date = datetime.fromisoformat(data["date"])

    # Criar transação vinculada ao cartão
    doc = {
        "user_id": user["_id"],
        "account_id": ObjectId(data["account_id"]),
        "category_id": ObjectId(data["category_id"]),
        "type": "expense",
        "amount": float(data["amount"]),
        "description": data["description"],
        "date": tx_date,
        "notes": data.get("notes"),
        "tags": data.get("tags", []),
        "is_paid": False,  # Faturas ficam pendentes até pagar a fatura
        "is_credit_card": True,
        "created_at": datetime.utcnow()
    }

    result = await transactions_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


# ──────────────── RECORRENTES ────────────────
@router.get("/recorrentes")
async def listar_recorrentes(
    x_api_key: str = Header(..., alias="X-API-Key"),
    limit: int = Query(50, le=200)
):
    user = await get_user_by_api_key(x_api_key)
    docs = await recurring_collection.find(
        {"user_id": user["_id"]}
    ).to_list(limit)
    return [_serialize(d) for d in docs]


@router.post("/recorrentes")
async def criar_recorrente(
    data: dict,
    x_api_key: str = Header(..., alias="X-API-Key")
):
    """Criar uma despesa/receita recorrente."""
    user = await get_user_by_api_key(x_api_key)

    required = ["account_id", "category_id", "amount", "description", "date"]
    for field in required:
        if field not in data:
            raise HTTPException(status_code=400, detail=f"Campo obrigatório: {field}")

    doc = {
        "user_id": user["_id"],
        "account_id": ObjectId(data["account_id"]),
        "category_id": ObjectId(data["category_id"]),
        "type": data.get("type", "expense"),
        "amount": float(data["amount"]),
        "description": data["description"],
        "frequency": data.get("frequency", "monthly"),
        "start_date": datetime.fromisoformat(data["date"]),
        "end_date": datetime.fromisoformat(data["end_date"]) if data.get("end_date") else None,
        "day_of_month": data.get("day_of_month"),
        "is_active": True,
        "company_id": ObjectId(data["company_id"]) if data.get("company_id") else None,
        "installments": data.get("installments"),
        "created_at": datetime.utcnow()
    }

    result = await recurring_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


# ──────────────── AGENDA ────────────────
@router.get("/agenda")
async def listar_agenda(
    x_api_key: str = Header(..., alias="X-API-Key"),
    limit: int = Query(50, le=200)
):
    user = await get_user_by_api_key(x_api_key)
    docs = await compromissos_collection.find(
        {"user_id": user["_id"]}
    ).sort("date", -1).to_list(limit)
    return [_serialize(d) for d in docs]


@router.post("/agenda")
async def criar_agenda(
    data: dict,
    x_api_key: str = Header(..., alias="X-API-Key")
):
    """Criar um compromisso na agenda."""
    user = await get_user_by_api_key(x_api_key)

    required = ["title", "date"]
    for field in required:
        if field not in data:
            raise HTTPException(status_code=400, detail=f"Campo obrigatório: {field}")

    now = datetime.utcnow()
    doc = {
        "user_id": user["_id"],
        "title": data["title"],
        "description": data.get("description"),
        "date": datetime.fromisoformat(data["date"]),
        "location": data.get("location"),
        "reminder": data.get("reminder", True),
        "created_at": now,
        "updated_at": now
    }

    result = await compromissos_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)
