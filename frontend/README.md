# Frontend — Plateforme de gestion de rendez-vous médicaux

React 18 + Vite + React Router. Aucune dépendance à un service cloud : les polices sont
installées via npm (`@fontsource`) et servies avec l'application.

## Démarrage

```bash
cp .env.example .env
npm install
npm run dev      # http://localhost:5173, /api redirigé vers VITE_DEV_API
npm test         # tests unitaires (Vitest)
npm run build    # génère dist/
```

## Rôles et pages

| Rôle | Pages |
| --- | --- |
| PATIENT | Trouver un médecin (recherche, filtre spécialité, prise de rendez-vous), Mes rendez-vous, Mes documents |
| DOCTOR | Mon planning (7 jours), Rendez-vous (confirmer / refuser / terminer), Documents patients |
| ADMIN | Tableau de bord, Rendez-vous, Médecins, Spécialités, Patients, Documents, Utilisateurs (CRUD) |

Les menus et routes sont filtrés par rôle côté React, mais **les droits doivent être vérifiés côté backend** (EF-02).

## Couverture du cahier des charges

| Exigence | Où |
| --- | --- |
| EF-01 Authentification | `pages/Login.jsx`, `pages/Register.jsx`, `auth/AuthContext.jsx` (JWT) |
| EF-02 Rôles | `components/Layout.jsx` (`RequireAuth`), menus par rôle |
| EF-03 CRUD, 3+ entités liées | Spécialités 1-N Médecins, Médecins 1-N Rendez-vous, Patients 1-N Rendez-vous / Documents (`components/CrudPage.jsx`) |
| EF-04 Recherche, filtres, pagination | `api/hooks.js` (`useList`), `components/ui.jsx` (`Pagination`) |
| EF-05 Dépôt de fichiers | `pages/Documents.jsx` (multipart, PDF/PNG/JPEG, 5 Mo) |
| EF-06 Tableau de bord | `pages/Dashboard.jsx` |

## Contrat d'API attendu du backend

Base : `/api` (le reverse proxy retire ou conserve le préfixe selon sa configuration ; en dev, Vite retire `/api`).
Authentification : en-tête `Authorization: Bearer <jwt>`. Identifiants opaques (entiers ou UUID).
Erreurs : statut HTTP + JSON `{ "message": "..." }` (ou `{ "detail": "..." }` pour FastAPI). `401` = jeton absent ou expiré.
Listes paginées : `?page=1&size=8&search=&...` → `{ "items": [...], "total": 42 }`.

| Méthode et chemin | Rôle | Description |
| --- | --- | --- |
| `POST /auth/register` `{name,email,password}` | public | Crée un compte PATIENT (et sa fiche patient) |
| `POST /auth/login` `{email,password}` | public | → `{ token, user: {id,name,email,role} }` |
| `GET /auth/me` | tous | Utilisateur courant |
| `GET /stats` | ADMIN | `{patients, doctors, specialties, appointmentsToday, appointmentsPending, byStatus:{PENDING,CONFIRMED,CANCELLED,DONE}, topSpecialties:[{name,count}]}` |
| `GET/POST /specialties`, `PUT/DELETE /specialties/:id` | lecture tous, écriture ADMIN | `{id,name,description,doctorsCount}` |
| `GET/POST /doctors`, `PUT/DELETE /doctors/:id` | lecture tous, écriture ADMIN | `{id,name,email,phone,specialty:{id,name}}` ; filtre `specialtyId` ; à la création : `specialtyId` + `password` |
| `GET /doctors/:id/slots?date=YYYY-MM-DD` | PATIENT, ADMIN | Créneaux libres : `["09:00","09:30",...]` |
| `GET/POST /patients`, `PUT/DELETE /patients/:id` | ADMIN (GET aussi DOCTOR : ses patients) | `{id,name,email,phone,birthDate}` |
| `GET /appointments` | tous (filtré selon le rôle) | Filtres `status`, `from`, `to`, `search`, `sort` ; `{id,startsAt,reason,status,doctor:{id,name,specialty:{id,name}},patient:{id,name}}` |
| `POST /appointments` `{doctorId,patientId?,startsAt,reason}` | PATIENT, ADMIN | `startsAt` = `2026-10-05T09:30:00` (heure locale) ; `409` si créneau pris |
| `PATCH /appointments/:id/status` `{status}` | selon rôle | `PENDING`, `CONFIRMED`, `CANCELLED`, `DONE` |
| `DELETE /appointments/:id` | ADMIN | |
| `GET /documents` | tous (filtré selon le rôle) | Filtre `patientId` ; `{id,title,size,createdAt,patient:{id,name}}` |
| `POST /documents` (multipart : `title`, `file`, `patientId` si non patient) | tous | Stockage sur volume persistant |
| `GET /documents/:id/file` | propriétaire, médecin concerné, ADMIN | Contenu du fichier |
| `DELETE /documents/:id` | propriétaire, ADMIN | |
| `GET/POST /users`, `PUT/DELETE /users/:id` | ADMIN | `{id,name,email,role,active}` ; filtre `role` |

## Déploiement (phase 2)

Le `Dockerfile` construit l'application (multi-étapes) et la sert avec Nginx sans droits root sur le port 8080.
Seul le reverse proxy publie un port sur la VM :

```yaml
# docker-compose.yml (extrait)
services:
  frontend:
    build: ./frontend
    expose: ["8080"]
  backend:
    build: ./backend
    expose: ["8000"]
  proxy:
    image: nginx:1.27-alpine
    ports: ["80:80"]
    volumes: ["./proxy/nginx.conf:/etc/nginx/conf.d/default.conf:ro"]
    depends_on: [frontend, backend]
```

```nginx
# proxy/nginx.conf
server {
  listen 80;
  client_max_body_size 6m;                 # dépôt de fichiers (5 Mo + marge)
  location /api/ { proxy_pass http://backend:8000/; }   # retire le préfixe /api
  location /     { proxy_pass http://frontend:8080; }
}
```

`VITE_API_URL` est fixé au build (`--build-arg VITE_API_URL=/api`) ; il ne contient aucun secret.

## Mode démo (sans backend)

`VITE_DEMO=true npm run dev` (ou `VITE_DEMO=true` dans `.env`) active une API simulée en mémoire (`src/api/mock.js`).
Comptes : `admin@demo.tn`, `medecin@demo.tn`, `patient@demo.tn` (mot de passe libre). À désactiver (`VITE_DEMO=false`) pour la vraie application.
