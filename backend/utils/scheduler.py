"""
Background notification scheduler.
Runs periodic checks and sends push notifications via Expo.
"""
import asyncio
from datetime import datetime, timedelta
from typing import Optional

from database import (
    users_collection,
    compromissos_collection,
    transactions_collection,
    notifications_collection,
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
    """Notify about unpaid transactions past due date."""
    now = datetime.utcnow()
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    cursor = transactions_collection.find({
        "is_paid": False,
        "due_date": {"$lt": start_of_today},
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
    """Notify about transactions due today."""
    now = datetime.utcnow()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)

    cursor = transactions_collection.find({
        "is_paid": False,
        "due_date": {"$gte": start, "$lt": end},
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

        # Count today's transactions
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
            await _check_daily_summary()
            print(f"[Scheduler] Checks completed.")
        except Exception as e:
            print(f"[Scheduler] Error: {e}")

        await asyncio.sleep(30 * 60)  # 30 minutes

