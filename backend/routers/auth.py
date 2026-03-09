import os
import bcrypt
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from bson import ObjectId
from database import users_collection
from models.user import UserCreate, UserLogin, UserResponse, ChangePassword, UserProfileUpdate

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
    return {"token": token, "user": {"id": str(result.inserted_id), "name": data.name, "email": data.email, "is_admin": False}}


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
        from utils.plan_limits import get_plan_info
        plan_info = get_plan_info(user)
        return {
            "token": token,
            "user": {
                "id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
                "is_admin": user.get("is_admin", False),
                **plan_info,
            }
        }
    except Exception as e:
        print(f"DEBUG: Erro inesperado no login: {str(e)}")
        raise e


@router.post("/change-password")
async def change_password(data: ChangePassword, current_user=Depends(get_current_user)):
    # Verify current password
    if not bcrypt.checkpw(data.current_password.encode(), current_user["password"].encode()):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="A nova senha deve ter pelo menos 6 caracteres")
    
    # Hash and save
    hashed = bcrypt.hashpw(data.new_password.encode(), bcrypt.gensalt()).decode()
    await users_collection.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"password": hashed}}
    )
    return {"message": "Senha alterada com sucesso"}


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    from utils.plan_limits import get_plan_info
    plan_info = get_plan_info(current_user)
    return {
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "phone": current_user.get("phone"),
        "ddi": current_user.get("ddi"),
        "cpf": current_user.get("cpf"),
        "is_brazilian": current_user.get("is_brazilian"),
        "cep": current_user.get("cep"),
        "city": current_user.get("city"),
        "state": current_user.get("state"),
        "address": current_user.get("address"),
        "birth_date": current_user.get("birth_date"),
        # Professional
        "education": current_user.get("education"),
        "occupation": current_user.get("occupation"),
        "salary_range": current_user.get("salary_range"),
        # Financial
        "housing_type": current_user.get("housing_type"),
        "household_size": current_user.get("household_size"),
        "has_vehicle": current_user.get("has_vehicle"),
        "vehicle_type": current_user.get("vehicle_type"),
        "equity": current_user.get("equity"),
        "created_at": current_user["created_at"],
        **plan_info,
    }


@router.post("/start-trial")
async def start_trial(current_user=Depends(get_current_user)):
    """Inicia o trial premium de 7 dias (apenas uma vez por usuário)."""
    from utils.plan_limits import get_effective_plan, get_plan_info
    from datetime import timedelta
    
    # Verificar se já usou o trial
    if current_user.get("trial_used"):
        raise HTTPException(status_code=400, detail="Você já utilizou seu período de degustação Premium.")
    
    # Verificar se já é premium (plano ativo, não expirado)
    effective = get_effective_plan(current_user)
    if effective == "premium":
        raise HTTPException(status_code=400, detail="Você já está no plano Premium.")
    
    trial_end = datetime.utcnow() + timedelta(days=7)
    
    # Gerar API key para WhatsApp a partir do telefone
    update_set: dict = {
        "trial_used": True,
        "trial_expires_at": trial_end,
        "preferences.whatsapp_enabled": True,
    }
    
    phone = current_user.get("phone", "")
    if phone:
        ddi = current_user.get("ddi", "55")
        phone_digits = "".join(c for c in phone if c.isdigit())
        if len(phone_digits) >= 10:
            ddd = phone_digits[:2]
            last8 = phone_digits[-8:]
        else:
            ddd = ""
            last8 = phone_digits
        update_set["preferences.api_key"] = f"{ddi}{ddd}{last8}"
    
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_set}
    )
    
    # Refetch user to return updated plan info
    updated = await users_collection.find_one({"_id": current_user["_id"]})
    plan_info = get_plan_info(updated)
    
    return {
        "message": "Trial Premium ativado! Aproveite 7 dias com todos os recursos.",
        **plan_info,
    }


@router.patch("/profile")
async def update_profile(data: UserProfileUpdate, current_user=Depends(get_current_user)):
    updates = {}
    if data.name is not None:
        updates["name"] = data.name.strip()
    if data.email is not None:
        normalized = data.email.strip().lower()
        # Check if email already taken by another user
        existing = await users_collection.find_one({"email": normalized, "_id": {"$ne": current_user["_id"]}})
        if existing:
            raise HTTPException(status_code=400, detail="Este email já está em uso")
        updates["email"] = normalized
    if data.phone is not None:
        updates["phone"] = data.phone.strip()
    if data.ddi is not None:
        updates["ddi"] = data.ddi.strip()
    if data.cpf is not None:
        cpf_val = data.cpf.strip()
        if cpf_val:
            # Check if CPF already taken by another user
            existing_cpf = await users_collection.find_one({"cpf": cpf_val, "_id": {"$ne": current_user["_id"]}})
            if existing_cpf:
                detail = f"CPF já cadastrado para o email: {existing_cpf['email']}"
                raise HTTPException(status_code=400, detail=detail)
        updates["cpf"] = cpf_val
    if data.is_brazilian is not None:
        updates["is_brazilian"] = data.is_brazilian
    if data.cep is not None:
        updates["cep"] = data.cep.strip()
    if data.city is not None:
        updates["city"] = data.city.strip()
    if data.state is not None:
        updates["state"] = data.state.strip()
    if data.address is not None:
        updates["address"] = data.address.strip()
    if data.birth_date is not None:
        updates["birth_date"] = data.birth_date.strip()
    
    # Professional
    if data.education is not None:
        updates["education"] = data.education.strip()
    if data.occupation is not None:
        updates["occupation"] = data.occupation.strip()
    if data.salary_range is not None:
        updates["salary_range"] = data.salary_range.strip()
        
    # Financial
    if data.housing_type is not None:
        updates["housing_type"] = data.housing_type.strip()
    if data.household_size is not None:
        updates["household_size"] = data.household_size
    if data.has_vehicle is not None:
        updates["has_vehicle"] = data.has_vehicle
    if data.vehicle_type is not None:
        updates["vehicle_type"] = data.vehicle_type.strip() if data.vehicle_type else None
    if data.equity is not None:
        updates["equity"] = data.equity
    
    if not updates:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    
    await users_collection.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": updates}
    )
    return {"message": "Perfil atualizado com sucesso"}


@router.delete("/account")
async def delete_account(delete_profile: bool = True, current_user=Depends(get_current_user)):
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
    
    # Delete user profile if requested
    if delete_profile:
        await users_collection.delete_one({"_id": ObjectId(user_id_obj)})
        return {"message": "Sua conta e todos os seus dados foram excluídos permanentemente"}
    
    return {"message": "Seus dados foram limpos, mas seu perfil foi mantido"}
