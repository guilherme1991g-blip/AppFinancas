"""
API Externa — Endpoints públicos autenticados via API Key (header X-API-Key).
Habilitados/desabilitados pelo toggle WhatsApp nas preferências do usuário.
"""
import calendar
from fastapi import APIRouter, HTTPException, Header, Query
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId
from database import (
    users_collection, accounts_collection, categories_collection,
    transactions_collection, bills_collection, compromissos_collection,
    recurring_collection
)
from utils.date_utils import calculate_due_date

router = APIRouter(prefix="/v1", tags=["external_api"])


async def get_user_by_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    """Authenticate user via phone number (DDI+DDD+number)."""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key não fornecida")

    # Keep only digits (removes +, spaces, dashes)
    clean_key = "".join(c for c in x_api_key if c.isdigit())

    if len(clean_key) < 10:
        raise HTTPException(status_code=401, detail="API key inválida")

    # Try stored api_key first
    user = await users_collection.find_one({"preferences.api_key": clean_key})

    # Fallback: match by phone number directly
    if not user:
        last8 = clean_key[-8:]
        async for u in users_collection.find({"phone": {"$exists": True}}):
            phone_digits = "".join(c for c in (u.get("phone") or "") if c.isdigit())
            if phone_digits and phone_digits[-8:] == last8:
                user = u
                # Save api_key for faster lookups next time
                await users_collection.update_one(
                    {"_id": u["_id"]},
                    {"$set": {"preferences.api_key": clean_key}}
                )
                break

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
    day: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    user = await get_user_by_api_key(x_api_key)
    query = {"user_id": user["_id"], "type": "expense"}

    if start_date and end_date:
        query["date"] = {
            "$gte": datetime.fromisoformat(start_date),
            "$lte": datetime.fromisoformat(end_date)
        }
    elif month and year:
        if day:
            start = datetime(year, month, day)
            end = start + timedelta(days=1)
        else:
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

    # Verificar se é cartão de crédito
    account = await accounts_collection.find_one({"_id": ObjectId(data["account_id"]), "user_id": user["_id"]})
    if not account:
         raise HTTPException(status_code=404, detail="Conta não encontrada")

    # Se for cartão, forçar is_paid=True e calcular due_date
    is_paid = data.get("is_paid", True)
    due_date = None
    if account.get("type") == "credit_card":
        is_paid = True
        closing_day = account.get("closing_day", 10)
        due_day = account.get("due_day", closing_day + 7)
        due_date = calculate_due_date(datetime.fromisoformat(data.get("date", datetime.utcnow().isoformat())), closing_day, due_day)

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
        "is_paid": is_paid,
        "due_date": due_date,
        "is_credit_card": account.get("type") == "credit_card",
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
    day: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    user = await get_user_by_api_key(x_api_key)
    query = {"user_id": user["_id"], "type": "income"}

    if start_date and end_date:
        query["date"] = {
            "$gte": datetime.fromisoformat(start_date),
            "$lte": datetime.fromisoformat(end_date)
        }
    elif month and year:
        if day:
            start = datetime(year, month, day)
            end = start + timedelta(days=1)
        else:
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

    # Verificar se é cartão de crédito
    account = await accounts_collection.find_one({"_id": ObjectId(data["account_id"]), "user_id": user["_id"]})
    if not account:
         raise HTTPException(status_code=404, detail="Conta não encontrada")

    # Se for cartão (estorno ou pagamento), forçar is_paid=True e calcular due_date
    is_paid = data.get("is_paid", True)
    due_date = None
    if account.get("type") == "credit_card":
        is_paid = True
        closing_day = account.get("closing_day", 10)
        due_day = account.get("due_day", closing_day + 7)
        due_date = calculate_due_date(datetime.fromisoformat(data.get("date", datetime.utcnow().isoformat())), closing_day, due_day)

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
        "is_paid": is_paid,
        "due_date": due_date,
        "is_credit_card": account.get("type") == "credit_card",
        "created_at": datetime.utcnow()
    }

    result = await transactions_collection.insert_one(doc)

    # Update account balance
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

    tx_date_base = datetime.fromisoformat(data["date"])
    installments = int(data.get("installments", 1))
    total_amount = float(data["amount"])
    installment_amount = total_amount / installments

    closing_day = account.get("closing_day", 10)
    due_day = account.get("due_day", closing_day + 7)

    created_docs = []

    for i in range(installments):
        # Calculate date for each installment (same day, consecutive months)
        new_month = (tx_date_base.month + i - 1) % 12 + 1
        new_year = tx_date_base.year + (tx_date_base.month + i - 1) // 12

        last_day = calendar.monthrange(new_year, new_month)[1]
        tx_day = min(tx_date_base.day, last_day)
        tx_date = datetime(new_year, new_month, tx_day, tx_date_base.hour, tx_date_base.minute, tx_date_base.second)

        # Calculate due_date based on card rules
        due_date = calculate_due_date(tx_date, closing_day, due_day)

        description = data["description"]
        if installments > 1:
            description = f"{description} ({i+1}/{installments})"

        doc = {
            "user_id": user["_id"],
            "account_id": ObjectId(data["account_id"]),
            "category_id": ObjectId(data["category_id"]),
            "type": "expense",
            "amount": installment_amount,
            "description": description,
            "date": tx_date,
            "due_date": due_date,
            "notes": data.get("notes"),
            "tags": data.get("tags", []),
            "is_paid": True,  # Para atualizar o saldo/limite do cartão imediatamente
            "is_credit_card": True,
            "created_at": datetime.utcnow()
        }

        result = await transactions_collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        created_docs.append(doc)

        # Atualizar o saldo (limite utilizado) do cartão
        await accounts_collection.update_one(
            {"_id": ObjectId(data["account_id"])},
            {"$inc": {"balance": -installment_amount}}
        )

    if installments == 1:
        return _serialize(created_docs[0])

    return [_serialize(d) for d in created_docs]


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
        {"user_id": str(user["_id"])}
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
        "user_id": str(user["_id"]),
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


@router.delete("/agenda/{agenda_id}")
async def excluir_agenda(
    agenda_id: str,
    x_api_key: str = Header(..., alias="X-API-Key")
):
    """Excluir um compromisso na agenda."""
    user = await get_user_by_api_key(x_api_key)

    result = await compromissos_collection.delete_one({
        "_id": ObjectId(agenda_id),
        "user_id": str(user["_id"])
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado ou não pertence ao usuário")

    return {"message": "Compromisso excluído com sucesso"}


# ──────────────── RELATÓRIO ────────────────
@router.get("/relatorio")
async def relatorio_consolidado(
    x_api_key: str = Header(..., alias="X-API-Key"),
    month: Optional[int] = None,
    year: Optional[int] = None,
    day: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Retorna um relatório consolidado de receitas, despesas (simples e recorrentes) e faturas."""
    user = await get_user_by_api_key(x_api_key)
    
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year
    
    if start_date and end_date:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
    elif day:
        start = datetime(y, m, day)
        end = start + timedelta(days=1)
    else:
        start = datetime(y, m, 1)
        end = datetime(y, m + 1, 1) if m < 12 else datetime(y + 1, 1, 1)

    # Buscar todas as contas do usuário
    accounts = await accounts_collection.find({"user_id": user["_id"]}).to_list(100)
    cc_account_ids = [acc["_id"] for acc in accounts if acc["type"] == "credit_card"]
    
    # --- 1. Receitas ---
    income_query = {
        "user_id": user["_id"],
        "type": "income",
        "date": {"$gte": start, "$lt": end}
    }
    income_docs = await transactions_collection.find(income_query).to_list(None)
    total_income = sum(d["amount"] for d in income_docs)

    # --- 2. Despesas Simples vs Recorrentes (Não-Cartão) ---
    expense_query = {
        "user_id": user["_id"],
        "type": "expense",
        "date": {"$gte": start, "$lt": end},
        "account_id": {"$nin": cc_account_ids}
    }
    expense_docs = await transactions_collection.find(expense_query).to_list(None)
    
    total_simple_expense = 0
    total_recurring_expense = 0
    
    for d in expense_docs:
        # Se tem recurring_id, é recorrente
        if d.get("recurring_id"):
            total_recurring_expense += d["amount"]
        else:
            total_simple_expense += d["amount"]

    # --- 3. Faturas de Cartão (Individualizadas) ---
    total_bills_consolidated = 0
    cards_detail = []
    
    for acc in accounts:
        if acc["type"] != "credit_card":
            continue
            
        acc_id = acc["_id"]
        card_total = 0
        
        # Tenta achar documento de fatura fechada
        bill = await bills_collection.find_one({
            "account_id": acc_id,
            "month": m,
            "year": y
        })
        
        if bill:
            card_total = abs(bill.get("amount", 0))
        else:
            # Cálculo virtual (transações que vencem neste mês)
            cc_tx_query = {
                "account_id": acc_id,
                "user_id": user["_id"],
                "$or": [
                    {"due_date": {"$gte": start, "$lt": end}},
                    {"due_date": None, "date": {"$gte": start, "$lt": end}}
                ]
            }
            async for tx in transactions_collection.find(cc_tx_query):
                amount = abs(tx["amount"])
                if tx["type"] == "expense":
                    card_total += amount
                else:
                    card_total -= amount
        
        if card_total > 0.01:
            cards_detail.append({
                "cartao": acc["name"],
                "total": card_total
            })
            total_bills_consolidated += card_total

    # --- 4. Consolidação por Categoria (Todas as Despesas + Faturas) ---
    # Para simplicidade, vamos agrupar todas as transações de despesa do período
    cat_pipeline = [
        {
            "$match": {
                "user_id": user["_id"],
                "type": "expense",
                "$or": [
                    # Despesas normais do período
                    {"date": {"$gte": start, "$lt": end}, "account_id": {"$nin": cc_account_ids}},
                    # Despesas de cartão que vencem no período
                    {"due_date": {"$gte": start, "$lt": end}, "account_id": {"$in": cc_account_ids}}
                ]
            }
        },
        {
            "$group": {
                "_id": "$category_id",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"total": -1}}
    ]
    
    cat_results = await transactions_collection.aggregate(cat_pipeline).to_list(100)
    categories_summary = []
    
    for r in cat_results:
        cat = await categories_collection.find_one({"_id": r["_id"]})
        categories_summary.append({
            "category_name": cat["name"] if cat else "Sem categoria",
            "total": r["total"],
            "count": r["count"]
        })

    # --- 5. Saldos de Contas (Não-Cartão) ---
    accounts_balances = []
    for acc in accounts:
        if acc["type"] != "credit_card":
            accounts_balances.append({
                "conta": acc["name"],
                "saldo": acc.get("balance", 0)
            })

    return {
        "periodo": f"{m:02d}/{y}",
        "resumo": {
            "receitas": total_income,
            "despesas_simples": total_simple_expense,
            "despesas_recorrentes": total_recurring_expense,
            "faturas_total": total_bills_consolidated,
            "total_despesas": total_simple_expense + total_recurring_expense + total_bills_consolidated,
            "saldo_periodo": total_income - (total_simple_expense + total_recurring_expense + total_bills_consolidated)
        },
        "detalhamento_cartoes": cards_detail,
        "saldos_contas": accounts_balances,
        "categorias": categories_summary
    }
