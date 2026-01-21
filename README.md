# App Financas

Aplicativo simples de controle financeiro com backend FastAPI e frontend Expo.

## Funcionalidades
- Listagem de transacoes e resumo do saldo
- Criar, editar e excluir transacoes
- Categorias de receitas e despesas
- Tela de configuracoes para URL do backend

## Backend (FastAPI)
1. Configure as variaveis de ambiente:
   - `MONGO_URL`
   - `DB_NAME`
2. Instale dependencias:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Rode o servidor:
   ```bash
   uvicorn backend.server:app --reload --host 0.0.0.0 --port 8000
   ```

## Frontend (Expo)
1. Instale dependencias:
   ```bash
   cd frontend
   yarn install
   ```
2. Configure a URL do backend:
   - Opcao A: usando env
     ```bash
     EXPO_PUBLIC_BACKEND_URL=http://localhost:8000 yarn start
     ```
   - Opcao B: no app, em Configuracoes > URL do Backend
3. Rode o app:
   ```bash
   yarn start
   ```

## Endpoints principais
- `GET /api` (health)
- `GET /api/categories`
- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/{id}`
- `DELETE /api/transactions/{id}`
- `GET /api/summary`
