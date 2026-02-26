import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

async def hunt():
    url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DATABASE_NAME", "appfinancas")
    client = AsyncIOMotorClient(url)
    db = client[db_name]
    
    print(f"Hunting in {db_name}...")
    
    # 1. Find all bills with amount 1000
    bills = await db.bills.find({"amount": {"$gte": 999, "$lte": 1001}}).to_list(100)
    print(f"Found {len(bills)} bills with amount approx 1000")
    for b in bills:
        print(f"Bill ID: {b['_id']}, Acc: {b['account_id']}, Month: {b['month']}/{b['year']}, Amount: {b['amount']}")
        
        # Check transactions for this bill
        # Use simple month/year check first
        from datetime import datetime
        start = datetime(b['year'], b['month'], 1)
        if b['month'] == 12:
            end = datetime(b['year']+1, 1, 1)
        else:
            end = datetime(b['year'], b['month']+1, 1)
            
        txs = await db.transactions.count_documents({
            "account_id": b['account_id'],
            "$or": [
                {"due_date": {"$gte": start, "$lt": end}},
                {"due_date": None, "date": {"$gte": start, "$lt": end}}
            ]
        })
        print(f"  Transactions found in month/year range: {txs}")

    client.close()

if __name__ == "__main__":
    asyncio.run(hunt())
