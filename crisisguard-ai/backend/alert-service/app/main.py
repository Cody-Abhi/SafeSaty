"""
CrisisGuard AI - Alert Service
FastAPI application for alert ingestion, classification, and dispatch.
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers.alerts import router as alerts_router
from app.services.deduplication import DeduplicationService

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if os.getenv("ENV", "development") == "development" else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("alert-service")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown hooks."""
    logger.info("🚨 CrisisGuard AI - Alert Service starting up")

    # Start deduplication cleanup task
    dedup = DeduplicationService()
    dedup.start_cleanup_task()

    yield

    logger.info("Alert Service shutting down")
    dedup.stop_cleanup_task()


app = FastAPI(
    title="CrisisGuard AI - Alert Service",
    description="Emergency alert ingestion, classification, and dispatch pipeline",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:3001")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(alerts_router, prefix="/api/alerts", tags=["alerts"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "service": "alert-service",
            "version": "1.0.0",
        },
    }
