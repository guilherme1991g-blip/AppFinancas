from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from enum import Enum


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Enums
class TransactionType(str, Enum):
    income = "income"
    expense = "expense"


# Define Models
class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: TransactionType
    amount: float
    description: str
    category: str
    date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TransactionCreate(BaseModel):
    type: TransactionType
    amount: float
    description: str
    category: str
    date: Optional[datetime] = None


class TransactionUpdate(BaseModel):
    type: Optional[TransactionType] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    date: Optional[datetime] = None


class BalanceSummary(BaseModel):
    total_income: float
    total_expense: float
    balance: float
    transaction_count: int


# Categories
INCOME_CATEGORIES = ["Salário", "Freelance", "Investimentos", "Vendas", "Outros"]
EXPENSE_CATEGORIES = ["Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Lazer", "Compras", "Contas", "Outros"]


# Routes
@api_router.get("/")
async def root():
    return {"message": "Finance App API"}


@api_router.get("/categories")
async def get_categories():
    return {
        "income": INCOME_CATEGORIES,
        "expense": EXPENSE_CATEGORIES
    }


@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(input: TransactionCreate):
    transaction_dict = input.model_dump()
    if transaction_dict.get('date') is None:
        transaction_dict['date'] = datetime.utcnow()
    transaction_obj = Transaction(**transaction_dict)
    await db.transactions.insert_one(transaction_obj.model_dump())
    return transaction_obj


@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(limit: int = 50, skip: int = 0):
    transactions = await db.transactions.find().sort("date", -1).skip(skip).limit(limit).to_list(limit)
    return [Transaction(**t) for t in transactions]


@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str):
    transaction = await db.transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return Transaction(**transaction)


@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, input: TransactionUpdate):
    transaction = await db.transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        await db.transactions.update_one(
            {"id": transaction_id},
            {"$set": update_data}
        )
    
    updated_transaction = await db.transactions.find_one({"id": transaction_id})
    return Transaction(**updated_transaction)


@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    result = await db.transactions.delete_one({"id": transaction_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted successfully"}


@api_router.get("/summary", response_model=BalanceSummary)
async def get_summary():
    transactions = await db.transactions.find().to_list(10000)
    
    total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    total_expense = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    balance = total_income - total_expense
    
    return BalanceSummary(
        total_income=total_income,
        total_expense=total_expense,
        balance=balance,
        transaction_count=len(transactions)
    )


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
