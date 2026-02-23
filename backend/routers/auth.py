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
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")


@router.post("/register")
async def register(data: UserCreate):
    existing = await users_collection.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    hashed_pw = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    user = {
        "name": data.name,
        "email": data.email,
        "password": hashed_pw,
        "created_at": datetime.utcnow()
    }
    result = await users_collection.insert_one(user)
    token = create_token(str(result.inserted_id))
    return {"token": token, "user": {"id": str(result.inserted_id), "name": data.name, "email": data.email}}


@router.post("/login")
async def login(data: UserLogin):
    user = await users_collection.find_one({"email": data.email})
    if not user or not bcrypt.checkpw(data.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    token = create_token(str(user["_id"]))
    return {"token": token, "user": {"id": str(user["_id"]), "name": user["name"], "email": user["email"]}}


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "created_at": current_user["created_at"]
    }
