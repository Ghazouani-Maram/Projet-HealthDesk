# Lancer l'application en local (frontend + backend + base de données)

Disposition conseillée du dépôt HealthDesk :

```
HealthDesk/
├── frontend/         
├── backend/          
├── db/schema.sql
├── docker-compose.yml
└── .env.example
```

Prérequis : **Node.js 18+** et **Python 3.11+**. Docker n'est nécessaire que pour PostgreSQL (optionnel).

## 1. Backend (terminal n°1)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate                 
pip install -r requirements.txt
copy .env.example .env                 
uvicorn app.main:app --reload --port 8000
```

- Au premier démarrage, la base est créée et remplie de données de démonstration.
- Page de test de l'API : http://localhost:8000/docs
- Base par défaut : **SQLite** (fichier `healthdesk.db`, rien à installer).

## 2. Frontend (terminal n°2)

```powershell
cd frontend
copy .env.example .env
# dans frontend/.env : VITE_DEMO=false
npm install
npm run dev
```

Ouvre http://localhost:5173. Vite redirige `/api` vers `localhost:8000`.


## 3. Utiliser PostgreSQL au lieu de SQLite (optionnel)

```powershell
copy .env.example .env                
docker compose up -d db
docker compose exec db psql -U healthdesk -d healthdesk -c "\dt"     
```

Puis, dans `backend/.env`, remplace la ligne `DATABASE_URL` par :

```
DATABASE_URL=postgresql+psycopg://healthdesk:LE_MOT_DE_PASSE@localhost:5432/healthdesk
```

Relance le backend : il remplit la base vide avec les données de démonstration.
`schema.sql` ne s'exécute qu'au premier démarrage du volume ; pour repartir de zéro : `docker compose down -v`.

## 4. Tests du backend

```powershell
cd backend
pip install -r requirements-dev.txt
pytest
```