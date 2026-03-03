import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os

# Configuração simples (ajuste conforme seu environment se necessário)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/app_financas")

async def migrate_compromissos():
    print(f"Conectando ao MongoDB: {MONGO_URI}")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database()
    compromissos_collection = db.get_collection("compromissos")

    # Buscar todos os compromissos onde user_id é do tipo ObjectId
    # No MongoDB, Type 7 é ObjectId
    cursor = compromissos_collection.find({"user_id": {"$type": 7}})
    docs = await cursor.to_list(length=None)
    
    if not docs:
        print("Nenhum agendamento antigo (ObjectId) encontrado para migrar.")
        return

    print(f"Encontrados {len(docs)} agendamentos para migrar.")
    
    count = 0
    for doc in docs:
        old_id = doc["user_id"]
        new_id_str = str(old_id)
        
        await compromissos_collection.update_one(
            {"_id": doc["_id"]},
            {"$set": {"user_id": new_id_str}}
        )
        count += 1
        print(f"Migrado: {doc['_id']} | {old_id} -> {new_id_str}")

    print(f"Sucesso! {count} agendamentos migrados de ObjectId para String.")

if __name__ == "__main__":
    asyncio.run(migrate_compromissos())
