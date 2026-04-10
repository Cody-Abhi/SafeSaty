"""
CrisisGuard AI - Evacuation Engine
FastAPI service for dynamic evacuation routing using graph-based pathfinding.
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import routing, assembly

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("evacuation-engine")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Evacuation engine starting up...")
    yield
    logger.info("Evacuation engine shutting down.")


app = FastAPI(
    title="CrisisGuard AI - Evacuation Engine",
    description="Dynamic evacuation routing with real-time hazard avoidance",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routing.router, prefix="/api/evacuation", tags=["Routing"])
app.include_router(assembly.router, prefix="/api/assembly", tags=["Assembly"])


@app.get("/health")
async def health():
    return {
        "success": True,
        "data": {
            "service": "evacuation-engine",
            "status": "healthy",
            "version": "1.0.0",
        },
    }
