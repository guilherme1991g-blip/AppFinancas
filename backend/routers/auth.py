import os
import bcrypt
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from bson import ObjectId
from database import users_collection
from models.user import UserCreate, UserLogin, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()
SECRET_KEY = os.getenv("SECRET_KEY", "financas-secret-key-2024")
ALGORITHM = "HS256"


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        print(f"Auth DEBUG: Decoding token for user_id: {user_id}")
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            print(f"Auth DEBUG: User {user_id} not found in database")
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return user
    except Exception as e:
        print(f"Auth DEBUG: Token validation failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Token inválido")


@router.post("/register")
async def register(data: UserCreate):
    normalized_email = data.email.strip().lower()
    normalized_name = data.name.strip()
    existing = await users_collection.find_one({"email": normalized_email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    hashed_pw = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    user = {
        "name": normalized_name,
        "email": normalized_email,
        "password": hashed_pw,
        "created_at": datetime.utcnow()
    }
    result = await users_collection.insert_one(user)
    token = create_token(str(result.inserted_id))
    return {"token": token, "user": {"id": str(result.inserted_id), "name": data.name, "email": data.email}}


@router.post("/login")
async def login(data: UserLogin):
    normalized_email = data.email.strip().lower()
    print(f"DEBUG: Tentativa de login para email: {normalized_email}")
    try:
        user = await users_collection.find_one({"email": normalized_email})
        print(f"DEBUG: Busca no banco concluída. Usuário encontrado: {user is not None}")
        
        if not user or not bcrypt.checkpw(data.password.encode(), user["password"].encode()):
            print("DEBUG: Falha na autenticação (email ou senha)")
            raise HTTPException(status_code=401, detail="Email ou senha incorretos")
        
        token = create_token(str(user["_id"]))
        print("DEBUG: Token gerado com sucesso")
        return {"token": token, "user": {"id": str(user["_id"]), "name": user["name"], "email": user["email"]}}
    except Exception as e:
        print(f"DEBUG: Erro inesperado no login: {str(e)}")
        raise e


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "created_at": current_user["created_at"]
    }


@router.delete("/account")
async def delete_account(current_user=Depends(get_current_user)):
    from database import (
        accounts_collection, categories_collection, transactions_collection,
        transfers_collection, budgets_collection, recurring_collection,
        companies_collection, bills_collection, sonhos_collection, compromissos_collection
    )
    user_id_obj = current_user["_id"]
    user_id_str = str(user_id_obj)
    
    # Delete all associated data (Collections using ObjectId)
    await accounts_collection.delete_many({"user_id": user_id_obj})
    await categories_collection.delete_many({"user_id": user_id_obj})
    await transactions_collection.delete_many({"user_id": user_id_obj})
    await transfers_collection.delete_many({"user_id": user_id_obj})
    await budgets_collection.delete_many({"user_id": user_id_obj})
    await recurring_collection.delete_many({"user_id": user_id_obj})
    await companies_collection.delete_many({"user_id": user_id_obj})
    await bills_collection.delete_many({"user_id": user_id_obj})
    
    # Delete all associated data (Collections using String)
    await sonhos_collection.delete_many({"user_id": user_id_str})
    await compromissos_collection.delete_many({"user_id": user_id_str})
    
    # Delete user (REMOVED: User requested not to delete the profile)
    # await users_collection.delete_one({"_id": ObjectId(user_id)})
    
    return {"message": "Dados e configurações removidos com sucesso"}
