import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "appfinancas")

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DATABASE_NAME]

# Collections
users_collection = db["users"]
accounts_collection = db["accounts"]
categories_collection = db["categories"]
transactions_collection = db["transactions"]
transfers_collection = db["transfers"]
budgets_collection = db["budgets"]
recurring_collection = db["recurring_transactions"]
companies_collection = db["companies"]
bills_collection = db["bills"]
sonhos_collection = db["sonhos"]
compromissos_collection = db["compromissos"]
notifications_collection = db["notifications"]
