import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import auth, accounts, categories, transactions, transfers, metas, recurring, companies, analytics, bills, preferences

app = FastAPI(
    title="App Finanças API",
    description="API para gestão financeira pessoal e empresarial",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(transfers.router)
app.include_router(metas.router)
app.include_router(recurring.router)
app.include_router(companies.router)
app.include_router(analytics.router)
app.include_router(bills.router)
app.include_router(preferences.router)


@app.get("/")
async def root():
    return {"message": "App Finanças API v1.0 🚀", "docs": "/docs"}
