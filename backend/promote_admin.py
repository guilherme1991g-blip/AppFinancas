import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import sys

load_dotenv()

async def promote_to_admin(email):
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    if not mongo_url or not db_name:
        print("Erro: MONGO_URL ou DB_NAME não encontrados no ambiente.")
        return

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    result = await db.users.update_one(
        {"email": email.strip().lower()},
        {"$set": {"is_admin": True}}
    )

    if result.matched_count > 0:
        print(f"Sucesso: Usuário {email} agora é um administrador.")
    else:
        print(f"Erro: Usuário com email {email} não encontrado.")
    
    client.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python promote_admin.py usuario@email.com")
    else:
        asyncio.run(promote_to_admin(sys.argv[1]))
