from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from database import categories_collection
from models.category import CategoryCreate, CategoryUpdate
from routers.auth import get_current_user

router = APIRouter(prefix="/categories", tags=["categories"])

DEFAULT_CATEGORIES = [
    # Despesas
    {"name": "Alimentação", "type": "expense", "icon": "restaurant", "color": "#FF6B6B"},
    {"name": "Transporte", "type": "expense", "icon": "car", "color": "#FF9F43"},
    {"name": "Moradia", "type": "expense", "icon": "home", "color": "#A29BFE"},
    {"name": "Saúde", "type": "expense", "icon": "medical", "color": "#FD79A8"},
    {"name": "Educação", "type": "expense", "icon": "school", "color": "#6C5ECF"},
    {"name": "Lazer", "type": "expense", "icon": "game-controller", "color": "#00CEC9"},
    {"name": "Compras", "type": "expense", "icon": "bag", "color": "#FDCB6E"},
    {"name": "Assinaturas", "type": "expense", "icon": "repeat", "color": "#74B9FF"},
    {"name": "Impostos", "type": "expense", "icon": "document-text", "color": "#B2BEC3"},
    {"name": "Outros", "type": "expense", "icon": "ellipsis-horizontal", "color": "#636E72"},
    # Receitas
    {"name": "Salário", "type": "income", "icon": "cash", "color": "#00D09C"},
    {"name": "Freelance", "type": "income", "icon": "briefcase", "color": "#55EFC4"},
    {"name": "Investimentos", "type": "income", "icon": "trending-up", "color": "#00B894"},
    {"name": "Outros", "type": "income", "icon": "add-circle", "color": "#81ECEC"},
]


def cat_doc(doc) -> dict:
    return {
        "id": str(doc["_id"]),
        "user_id": str(doc["user_id"]),
        "name": doc["name"],
        "type": doc["type"],
        "icon": doc.get("icon", "pricetag"),
        "color": doc.get("color", "#6C5ECF"),
        "parent_id": str(doc["parent_id"]) if doc.get("parent_id") else None,
        "is_default": doc.get("is_default", False)
    }


@router.get("")
async def list_categories(current_user=Depends(get_current_user)):
    docs = await categories_collection.find({"user_id": current_user["_id"]}).to_list(length=200)
    return [cat_doc(d) for d in docs]


@router.post("/seed")
async def seed_categories(current_user=Depends(get_current_user)):
    existing = await categories_collection.count_documents({"user_id": current_user["_id"]})
    if existing > 0:
        return {"message": "Categorias já existem"}
    docs = [{**c, "user_id": current_user["_id"], "is_default": True, "created_at": datetime.utcnow()} for c in DEFAULT_CATEGORIES]
    await categories_collection.insert_many(docs)
    return {"message": f"{len(docs)} categorias criadas"}


@router.post("")
async def create_category(data: CategoryCreate, current_user=Depends(get_current_user)):
    doc = {**data.dict(), "user_id": current_user["_id"], "is_default": False, "created_at": datetime.utcnow()}
    result = await categories_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return cat_doc(doc)


@router.put("/{category_id}")
async def update_category(category_id: str, data: CategoryUpdate, current_user=Depends(get_current_user)):
    obj_id = ObjectId(category_id)
    user_id = current_user["_id"]
    
    # Check if it's the protected "Outros" category
    cat = await categories_collection.find_one({"_id": obj_id, "user_id": user_id})
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    if cat.get("is_default") and cat.get("name") == "Outros":
        raise HTTPException(status_code=400, detail="A categoria 'Outros' é padrão do sistema e não pode ser editada.")

    update_data = {k: v for k, v in data.dict().items() if v is not None}
    await categories_collection.update_one(
        {"_id": obj_id, "user_id": user_id},
        {"$set": update_data}
    )
    doc = await categories_collection.find_one({"_id": obj_id})
    return cat_doc(doc)


@router.delete("/{category_id}")
async def delete_category(category_id: str, current_user=Depends(get_current_user)):
    from database import transactions_collection, categories_collection, recurring_collection
    
    obj_id = ObjectId(category_id)
    user_id = current_user["_id"]
    
    # Check for linked transactions
    has_transactions = await transactions_collection.find_one({
        "user_id": user_id,
        "category_id": obj_id
    })
    if has_transactions:
        raise HTTPException(
            status_code=400, 
            detail="Não é possível excluir uma categoria que possui transações vinculadas. Mova as transações para outra categoria primeiro."
        )
        
    # Check for linked recurring transactions
    has_recurring = await recurring_collection.find_one({
        "user_id": user_id,
        "category_id": obj_id
    })
    if has_recurring:
        raise HTTPException(
            status_code=400, 
            detail="Não é possível excluir uma categoria que possui lançamentos recorrentes vinculados. Remova os lançamentos recorrentes primeiro."
        )

    # Check for child categories
    has_children = await categories_collection.find_one({
        "user_id": user_id,
        "parent_id": obj_id
    })
    if has_children:
        raise HTTPException(
            status_code=400, 
            detail="Não é possível excluir uma categoria que possui subcategorias. Exclua as subcategorias primeiro."
        )

    # Check if it's the protected "Outros" category
    cat = await categories_collection.find_one({
        "_id": obj_id,
        "user_id": user_id
    })
    if cat and cat.get("is_default") and cat.get("name") == "Outros":
        raise HTTPException(
            status_code=400,
            detail="A categoria 'Outros' é padrão do sistema e não pode ser removida."
        )

    result = await categories_collection.delete_one(
        {"_id": obj_id, "user_id": user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return {"message": "Categoria removida"}
