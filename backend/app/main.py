from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from .config import settings
from .db import Base, SessionLocal, engine
from .routers import appointments, auth, doctors, documents, patients, specialties, stats, users
from .seed import seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)  # crée les tables manquantes (sans toucher à celles de schema.sql)
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    if settings.seed_demo_data:
        with SessionLocal() as db:
            seed(db)
    yield


app = FastAPI(title="HealthDesk API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_methods=["*"], allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    first = exc.errors()[0]
    field = str(first["loc"][-1]) if first.get("loc") else "donnée"
    return JSONResponse(status_code=422, content={"message": f"Valeur invalide pour « {field} » : {first['msg']}"})


@app.exception_handler(IntegrityError)
async def integrity_error(_: Request, __: IntegrityError):
    return JSONResponse(status_code=409, content={"message": "Conflit avec des données existantes"})


@app.get("/health", tags=["Santé"])
def health():
    return {"status": "ok"}


for module in (auth, specialties, doctors, patients, users, appointments, documents, stats):
    app.include_router(module.router)
