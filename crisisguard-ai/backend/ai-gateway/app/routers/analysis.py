"""
CrisisGuard AI - Analysis Router
AI analysis endpoints for image, text, and multilingual processing.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.models.analysis_models import (
    ImageAnalysisRequest,
    TextAnalysisRequest,
    MultilingualRequest,
    ThreatClassification,
    TextClassificationResult,
    TranslationResult,
)
from app.services.gemini_service import GeminiService

logger = logging.getLogger(__name__)

router = APIRouter()
gemini_service = GeminiService()


@router.post(
    "/analyze/image",
    response_model=dict,
    summary="Analyze image for threats (CCTV / uploaded)",
)
async def analyze_image(request: ImageAnalysisRequest):
    """
    Analyze a CCTV frame or uploaded image for safety threats.
    Accepts either an image URL or base64-encoded image data.
    """
    if not request.image_url and not request.image_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either image_url or image_base64 is required",
        )

    context_parts = []
    if request.zone:
        context_parts.append(f"Zone: {request.zone}")
    if request.floor is not None:
        context_parts.append(f"Floor: {request.floor}")
    if request.camera_id:
        context_parts.append(f"Camera: {request.camera_id}")
    if request.context:
        context_parts.append(request.context)

    context = "; ".join(context_parts) if context_parts else None

    result = await gemini_service.analyze_image(
        image_url=request.image_url,
        image_base64=request.image_base64,
        context=context,
    )

    classification = ThreatClassification(**result)

    logger.info(
        "Image analysis complete",
        extra={
            "property_id": request.property_id,
            "threat_level": classification.threat_level.value,
            "confidence": classification.confidence,
            "requires_action": classification.requires_immediate_action,
        },
    )

    return {
        "success": True,
        "data": {
            "classification": classification.model_dump(),
            "property_id": request.property_id,
            "camera_id": request.camera_id,
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
        },
    }


@router.post(
    "/analyze/text",
    response_model=dict,
    summary="Analyze text for threats and intent",
)
async def analyze_text(request: TextAnalysisRequest):
    """
    Analyze guest messages, staff reports, or social media posts
    for threat classification and intent detection.
    """
    result = await gemini_service.analyze_text(
        text=request.text,
        source=request.source,
    )

    classification = TextClassificationResult(**result)

    logger.info(
        "Text analysis complete",
        extra={
            "property_id": request.property_id,
            "threat_level": classification.threat_level.value,
            "intent": classification.intent,
            "requires_escalation": classification.requires_escalation,
        },
    )

    return {
        "success": True,
        "data": {
            "classification": classification.model_dump(),
            "property_id": request.property_id,
            "source": request.source,
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
        },
    }


@router.post(
    "/analyze/translate",
    response_model=dict,
    summary="Translate and assess guest message",
)
async def translate_and_assess(request: MultilingualRequest):
    """
    Translate a guest message to the target language and simultaneously
    assess it for any emergency or safety concern.
    """
    result = await gemini_service.translate_and_assess(
        text=request.text,
        target_language=request.target_language,
    )

    translation = TranslationResult(
        original_text=request.text,
        detected_language=result.get("detected_language", "unknown"),
        translated_text=result.get("translated_text", request.text),
        threat_assessment=ThreatClassification(**result.get("threat_assessment", {
            "threat_level": "none",
            "confidence": 0.5,
            "description": "Assessment unavailable",
        })),
        is_emergency=result.get("is_emergency", False),
    )

    logger.info(
        "Translation and assessment complete",
        extra={
            "property_id": request.property_id,
            "detected_language": translation.detected_language,
            "is_emergency": translation.is_emergency,
        },
    )

    return {
        "success": True,
        "data": {
            "result": translation.model_dump(),
            "property_id": request.property_id,
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
        },
    }
