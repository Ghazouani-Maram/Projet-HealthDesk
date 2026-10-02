# Lancer l'application en local (frontend + backend + base de données)

Disposition conseillée du dépôt HealthDesk :

```
HealthDesk/
├── frontend/          ← le projet React (archive frontend-rdv-medicaux.zip)
├── backend/           ← cette archive
├── db/schema.sql
├── docker-compose.yml
└── .env.example
```

Prérequis : **Node.js 18+** et **Python 3.11+**. Docker n'est nécessaire que pour PostgreSQL (optionnel).

## 1. Backend (terminal n°1)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate                 # Linux / macOS : source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env                 # Linux / macOS : cp .env.example .env
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

## 3. Comptes de démonstration

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| Administrateur | `admin@demo.tn` | `Admin123!` |
| Médecin | `medecin@demo.tn` | `Demo1234!` |
| Patient | `patient@demo.tn` | `Demo1234!` |

Les autres médecins et patients de démonstration (`k.trabelsi@demo.tn`, `o.bouzid@demo.tn`, etc.) ont le mot de passe `Demo1234!`.
Ces comptes sont réservés au développement : en production, mettre `SEED_DEMO_DATA=false` et créer un vrai administrateur.

## 4. Utiliser PostgreSQL au lieu de SQLite (optionnel)

```powershell
copy .env.example .env                 # à la racine : définir POSTGRES_PASSWORD
docker compose up -d db
docker compose exec db psql -U healthdesk -d healthdesk -c "\dt"     # doit lister les 7 tables
```

Puis, dans `backend/.env`, remplace la ligne `DATABASE_URL` par :

```
DATABASE_URL=postgresql+psycopg://healthdesk:LE_MOT_DE_PASSE@localhost:5432/healthdesk
```

Relance le backend : il remplit la base vide avec les données de démonstration.
`schema.sql` ne s'exécute qu'au premier démarrage du volume ; pour repartir de zéro : `docker compose down -v`.

## 5. Tests du backend

```powershell
cd backend
pip install -r requirements-dev.txt
pytest
```

Les tests couvrent : connexion, inscription, droits par rôle, pagination et recherche, réservation et double réservation, statuts, documents et accès, suppression refusée, tableau de bord.

## 6. Problèmes fréquents

| Symptôme | Cause et solution |
| --- | --- |
| « Une erreur est survenue » à la connexion | Le backend n'est pas lancé (terminal n°1), ou `VITE_DEMO` vaut encore `true` |
| `ECONNREFUSED` dans le terminal de Vite | Le backend n'écoute pas sur le port 8000 |
| Port 5432 déjà utilisé | Un PostgreSQL local tourne : l'arrêter, ou utiliser `5433:5432` dans `docker-compose.yml` |
| Données de démonstration à refaire | Arrêter le backend, supprimer `backend/healthdesk.db` (et `backend/uploads`), relancer |
