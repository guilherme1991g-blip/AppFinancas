"""
Background notification scheduler.
Runs periodic checks and sends push notifications via Firebase FCM.
"""
import asyncio
from datetime import datetime, timedelta
from typing import Optional

from database import (
    users_collection,
    compromissos_collection,
    transactions_collection,
    notifications_collection,
    budgets_collection,
    accounts_collection,
)
from utils.notifications import send_push_notification


# ───────────────────────── helpers ─────────────────────────

async def _get_user_pref(user: dict, key: str) -> bool:
    """Check if a notification preference is enabled for the user."""
    prefs = user.get("preferences", {})
    notifs = prefs.get("notifications", {}) if isinstance(prefs, dict) else {}
    return notifs.get(key, True)  # default enabled


async def _already_notified(user_id: str, notif_type: str, ref_id: str) -> bool:
    """Avoid duplicate notifications for the same event."""
    existing = await notifications_collection.find_one({
        "user_id": user_id,
        "type": notif_type,
        "data.ref_id": ref_id,
    })
    return existing is not None


async def _create_and_send(user: dict, title: str, body: str,
                           notif_type: str, ref_id: str,
                           extra_data: Optional[dict] = None):
    """Persist notification + send push."""
    user_id = str(user["_id"])

    if await _already_notified(user_id, notif_type, ref_id):
        return

    data = {"ref_id": ref_id}
    if extra_data:
        data.update(extra_data)

    await notifications_collection.insert_one({
        "user_id": user_id,
        "title": title,
        "body": body,
        "type": notif_type,
        "data": data,
        "read": False,
        "created_at": datetime.utcnow(),
    })

    token = user.get("push_token")
    if token:
        # Run sync push in thread to avoid blocking the event loop
        await asyncio.to_thread(send_push_notification, token, title, body, data)


# ───────────────────── individual checks ──────────────────

async def _check_upcoming_compromissos():
    """Notify about compromissos happening in the next hour."""
    now = datetime.utcnow()
    one_hour = now + timedelta(hours=1)

    cursor = compromissos_collection.find({
        "date": {"$gte": now, "$lte": one_hour},
        "reminder": True,
    })
    docs = await cursor.to_list(length=200)

    for doc in docs:
        user_id = doc["user_id"]
        user = await users_collection.find_one({"_id": __to_oid(user_id)})
        if not user:
            continue
        if not await _get_user_pref(user, "agenda_reminders"):
            continue

        await _create_and_send(
            user,
            title="📅 Compromisso próximo",
            body=f"{doc['title']} começa em breve!",
            notif_type="agenda",
            ref_id=str(doc["_id"]),
        )


async def _check_overdue_transactions():
    """Notify about unpaid transactions past due date. (Skips recurring/fixed)"""
    now = datetime.utcnow()
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    cursor = transactions_collection.find({
        "is_paid": False,
        "due_date": {"$lt": start_of_today},
        "recurring_id": {"$exists": False}, # Do not notify recurring here
    })
    docs = await cursor.to_list(length=200)

    for doc in docs:
        user_id = doc["user_id"]
        user = await users_collection.find_one({"_id": __to_oid(user_id)})
        if not user:
            continue
        if not await _get_user_pref(user, "overdue_bills"):
            continue

        await _create_and_send(
            user,
            title="🔴 Conta vencida",
            body=f"\"{doc['description']}\" está atrasada. Não esqueça de pagar!",
            notif_type="overdue",
            ref_id=str(doc["_id"]),
        )


async def _check_due_today_transactions():
    """Notify about transactions due today. (Skips recurring/fixed)"""
    now = datetime.utcnow()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)

    cursor = transactions_collection.find({
        "is_paid": False,
        "due_date": {"$gte": start, "$lt": end},
        "recurring_id": {"$exists": False}, # Do not notify recurring here
    })
    docs = await cursor.to_list(length=200)

    for doc in docs:
        user_id = doc["user_id"]
        user = await users_collection.find_one({"_id": __to_oid(user_id)})
        if not user:
            continue
        if not await _get_user_pref(user, "due_today_bills"):
            continue

        await _create_and_send(
            user,
            title="📆 Conta vence hoje",
            body=f"\"{doc['description']}\" vence hoje!",
            notif_type="overdue",
            ref_id=str(doc["_id"]) + "_today",
        )


async def _check_goal_progress():
    """Check budget goals (metas) for the current month and notify at 80%, 90%, 100%."""
    now = datetime.utcnow()
    month, year = now.month, now.year
    start_of_month = datetime(year, month, 1)
    if month == 12:
        end_of_month = datetime(year + 1, 1, 1)
    else:
        end_of_month = datetime(year, month + 1, 1)

    # Get all metas for this month
    cursor = budgets_collection.find({"month": month, "year": year})
    metas = await cursor.to_list(length=500)

    for meta in metas:
        user_id = str(meta["user_id"])
        user = await users_collection.find_one({"_id": __to_oid(user_id)})
        if not user:
            continue
        
        # Calculate current spent for this category
        from database import categories_collection
        category = await categories_collection.find_one({"_id": meta["category_id"]})
        category_name = category["name"] if category else "Categoria"

        pipeline = [
            {"$match": {
                "user_id": meta["user_id"],
                "category_id": meta["category_id"],
                "type": "expense",
                "date": {"$gte": start_of_month, "$lt": end_of_month}
            }},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        res = await transactions_collection.aggregate(pipeline).to_list(1)
        spent = res[0]["total"] if res else 0.0
        limit = meta["amount"]

        if limit <= 0:
            continue

        pct = (spent / limit) * 100
        levels = [100, 90, 80]
        
        for level in levels:
            if pct >= level:
                ref_id = f"meta_{meta['_id']}_{level}"
                title = "🎯 Alerta de Meta"
                if level == 100:
                    body = f"Você atingiu 100% da meta em {category_name}! (R$ {spent:,.2f} / R$ {limit:,.2f})"
                else:
                    body = f"Atenção! Você já usou {level}% da meta de {category_name}."
                
                await _create_and_send(user, title, body, "system", ref_id)
                break # Only notify the highest hit level


async def _check_credit_card_bills():
    """Notify 3 days before CC closing and 3 days before due date."""
    now = datetime.utcnow()
    today_num = now.day
    three_days_later = (now + timedelta(days=3)).day

    # This is a simplified check: we check if closing_day or due_day is 3 days away
    cursor = accounts_collection.find({"type": "credit_card"})
    cards = await cursor.to_list(length=200)

    for card in cards:
        user_id = str(card["user_id"])
        user = await users_collection.find_one({"_id": __to_oid(user_id)})
        if not user:
            continue

        closing_day = card.get("closing_day", 10)
        due_day = card.get("due_day", 17)

        # Closing reminder
        if three_days_later == closing_day:
            await _create_and_send(
                user,
                title="💳 Fatura Fechando",
                body=f"Sua fatura do cartão {card['name']} fecha em 3 dias.",
                notif_type="system",
                ref_id=f"closing_{card['_id']}_{now.month}_{now.year}"
            )

        # Due date reminder
        if three_days_later == due_day:
            await _create_and_send(
                user,
                title="📅 Vencimento de Cartão",
                body=f"A fatura do cartão {card['name']} vence em 3 dias. Lembre-se de pagar!",
                notif_type="system",
                ref_id=f"due_cc_{card['_id']}_{now.month}_{now.year}"
            )


async def _check_daily_summary():
    """Send daily summary at ~20:00 UTC-3 (23:00 UTC)."""
    now = datetime.utcnow()
    if now.hour != 23:  # 20h BRT = 23h UTC
        return

    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)

    # Get all users with daily_summary enabled
    cursor = users_collection.find({"push_token": {"$exists": True, "$ne": None}})
    users = await cursor.to_list(length=500)

    for user in users:
        if not await _get_user_pref(user, "daily_summary"):
            continue

        user_id = str(user["_id"])
        ref_id = f"daily_{start.strftime('%Y-%m-%d')}"

        if await _already_notified(user_id, "system", ref_id):
            continue

        # Count today's transactions (can exclude fixed if we want cleaner summary)
        tx_cursor = transactions_collection.find({
            "user_id": user_id,
            "date": {"$gte": start, "$lt": end},
        })
        txs = await tx_cursor.to_list(length=500)

        income = sum(t["amount"] for t in txs if t.get("type") == "income")
        expense = sum(t["amount"] for t in txs if t.get("type") == "expense")

        if len(txs) == 0:
            continue

        body = f"Hoje: {len(txs)} movimentações"
        if expense > 0:
            body += f" • Gastos: R$ {expense:,.2f}"
        if income > 0:
            body += f" • Receitas: R$ {income:,.2f}"

        await _create_and_send(
            user,
            title="📊 Resumo do dia",
            body=body,
            notif_type="system",
            ref_id=ref_id,
        )


# ──────────────────────── helper ───────────────────────────

def __to_oid(val):
    """Convert string to ObjectId if needed."""
    from bson import ObjectId
    if isinstance(val, str):
        return ObjectId(val)
    return val


# ──────────────────────── main loop ────────────────────────

async def notification_scheduler():
    """Background loop: runs every 30 minutes."""
    print("🔔 Notification scheduler started!")

    # Wait 30s before first run to let the server stabilize
    await asyncio.sleep(30)

    while True:
        try:
            print(f"[Scheduler] Running checks at {datetime.utcnow().isoformat()}")
            await _check_upcoming_compromissos()
            await _check_overdue_transactions()
            await _check_due_today_transactions()
            await _check_goal_progress()
            await _check_credit_card_bills()
            await _check_daily_summary()
            print(f"[Scheduler] Checks completed.")
        except Exception as e:
            print(f"[Scheduler] Error: {e}")

        await asyncio.sleep(30 * 60)  # 30 minutes

