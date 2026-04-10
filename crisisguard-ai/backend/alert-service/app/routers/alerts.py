"""
CrisisGuard AI - Alert Router
POST /api/alerts/submit endpoint.
Handles the full alert ingestion pipeline:
  Validation -> Dedup -> Classify -> Store -> Publish
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.models.alert_models import (
    SOSPayload,
    AlertResponse,
    EmergencyEvent,
    IncidentStatus,
)
from app.services.severity_classifier import SeverityClassifier
from app.services.deduplication import DeduplicationService
from app.services.pubsub_publisher import PubSubPublisher

logger = logging.getLogger(__name__)

router = APIRouter()

# Service instances (singleton pattern via classes)
severity_classifier = SeverityClassifier()
dedup_service = DeduplicationService()
pubsub_publisher = PubSubPublisher()


@router.post(
    "/submit",
    response_model=AlertResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit an emergency alert",
    description="Ingests an SOS alert, classifies severity, deduplicates, stores to Firestore, and publishes to Pub/Sub.",
)
async def submit_alert(payload: SOSPayload) -> AlertResponse:
    """
    Full alert ingestion pipeline:

    1. Validate input (handled by Pydantic)
    2. Check deduplication (30-second window per user+type)
    3. Classify severity (rules-based + contextual escalation)
    4. Generate unique event ID
    5. Store to Firestore (emergencyEvents collection)
    6. Publish to Cloud Pub/Sub (confirmed-alerts topic)
    7. Return event ID to client
    """
    request_time = datetime.now(timezone.utc)

    # ─── Step 2: Deduplication ──────────────────────────────
    if dedup_service.is_duplicate(payload.guest_uid, payload.type.value):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "DUPLICATE_ALERT",
                "message": f"Duplicate {payload.type.value} alert from same user within 30 seconds",
            },
        )

    # ─── Step 3: Severity Classification ────────────────────
    severity = severity_classifier.classify(
        emergency_type=payload.type,
        silent=payload.silent,
        battery_level=payload.device_battery,
    )

    # ─── Step 4: Generate Event ID ──────────────────────────
    event_id = f"evt-{uuid.uuid4().hex[:12]}"

    # ─── Step 5: Create Emergency Event ─────────────────────
    event = EmergencyEvent(
        event_id=event_id,
        property_id=payload.property_id,
        type=payload.type,
        severity=severity,
        status=IncidentStatus.DETECTED,
        source=payload.source,
        location=payload.location,
        detected_at=request_time.isoformat(),
        guest_uid=payload.guest_uid,
        silent=payload.silent,
        metadata={
            "device_battery": payload.device_battery,
            "locale": payload.locale,
            "attachments": payload.attachments or [],
            "original_timestamp": payload.timestamp,
        },
    )

    # ─── Step 5b: Store to Firestore ────────────────────────
    try:
        await _store_event_to_firestore(event)
    except Exception as e:
        logger.error(f"Failed to store event to Firestore: {e}", extra={"event_id": event_id})
        # Don't block the pipeline — continue to publish

    # ─── Step 6: Publish to Pub/Sub ─────────────────────────
    event_data = event.model_dump()
    message_id = await pubsub_publisher.publish_alert(event_data)

    logger.info(
        "🚨 Alert processed successfully",
        extra={
            "event_id": event_id,
            "type": payload.type.value,
            "severity": severity.value,
            "property_id": payload.property_id,
            "guest_uid": payload.guest_uid,
            "silent": payload.silent,
            "pubsub_message_id": message_id,
        },
    )

    # ─── Step 7: Return Response ────────────────────────────
    return AlertResponse(
        success=True,
        event_id=event_id,
        severity=severity,
        status=IncidentStatus.DETECTED,
        message=f"Emergency alert received. Event ID: {event_id}. Responders notified.",
        timestamp=request_time.isoformat(),
    )


async def _store_event_to_firestore(event: EmergencyEvent) -> None:
    """
    Store emergency event to Firestore.
    Falls back to logging if Firestore is unavailable.
    """
    try:
        import firebase_admin
        from firebase_admin import firestore as fb_firestore

        # Initialize Firebase if not already done
        try:
            firebase_admin.get_app()
        except ValueError:
            firebase_admin.initialize_app()

        db = fb_firestore.client()
        doc_ref = db.collection("emergencyEvents").document(event.event_id)
        doc_ref.set(event.model_dump())

        logger.info(f"Event stored to Firestore: {event.event_id}")

    except Exception as e:
        logger.warning(
            f"Firestore unavailable — event logged locally: {e}",
            extra={"event_id": event.event_id},
        )
        # Log the full event for recovery
        logger.info(f"EVENT_BACKUP: {event.model_dump()}")
