from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from core.db import ensure_indexes
from routers import auth as auth_router
from routers import datasets as datasets_router

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("vocis")

app = FastAPI(title="VOCIS Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(datasets_router.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "vocis"}


@app.on_event("startup")
async def startup():
    await ensure_indexes()
    await auth_router.seed_admin()
    logger.info("VOCIS backend ready")
