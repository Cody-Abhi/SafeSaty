"""
CrisisGuard AI - AI Gateway Service
FastAPI service for AI-powered threat analysis using Google Gemini.
Provides endpoints for:
  - Image analysis (CCTV frame classification)
  - Text analysis (report/message classification)
  - Multilingual NLP (guest message processing)
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers.analysis import router as analysis_router
from app.routers.chat import router as chat_router
from app.routers.summarization import router as summarization_router

load_dotenv()

logging.basicConfig(
    level=logging.DEBUG if os.getenv("ENV", "development") == "development" else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ai-gateway")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("🧠 CrisisGuard AI - AI Gateway starting up")
    yield
    logger.info("AI Gateway shutting down")


app = FastAPI(
    title="CrisisGuard AI - AI Gateway",
    description="AI-powered threat analysis and classification service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:3001")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_router, prefix="/api/ai", tags=["ai-analysis"])
app.include_router(chat_router, prefix="/api/ai", tags=["ai-chat"])
app.include_router(summarization_router, prefix="/api/ai", tags=["ai-summarization"])


@app.get("/health")
async def health_check():
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "service": "ai-gateway",
            "version": "1.0.0",
            "model": os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        },
    }
