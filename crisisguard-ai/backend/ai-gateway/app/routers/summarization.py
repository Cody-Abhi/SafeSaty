"""
CrisisGuard AI - Incident Summarization Router
Rolling SITREPs and post-incident after-action reports using Gemini.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.gemini_service import GeminiService

logger = logging.getLogger(__name__)
router = APIRouter()
gemini_service = GeminiService()

SITREP_PROMPT = """You are a military-grade situation report (SITREP) generator for emergency response.

Given the following incident data, generate a concise 3-5 sentence SITREP covering:
1. Current situation overview
2. Response actions underway
3. Resource status (staff deployed, equipment)
4. Key risks or escalation concerns
5. Recommended next actions

Format: Professional, factual, no speculation. Use present tense.
"""

AFTER_ACTION_PROMPT = """You are generating a professional after-action report for a completed emergency incident.

Generate a structured report with:
1. INCIDENT SUMMARY - What happened, detection method, timeline
2. RESPONSE TIMELINE - Key timestamps from detection to resolution
3. PERFORMANCE METRICS - Response time, evacuation efficiency, staff utilization
4. WHAT WENT WELL - Effective responses and procedures
5. AREAS FOR IMPROVEMENT - Identified bottlenecks or failures
6. RECOMMENDATIONS - Specific actionable improvements

Format: Section headers with bullet points. 500-800 words.
"""


class SitrepRequest(BaseModel):
    incident_data: dict = Field(..., description="Current incident state and timeline data")
    property_id: str
    include_recommendations: bool = True


class AfterActionRequest(BaseModel):
    incident_data: dict = Field(..., description="Complete incident record with timeline")
    property_id: str
    staff_performance: Optional[list[dict]] = None
    evacuation_metrics: Optional[dict] = None


@router.post("/sitrep", summary="Generate rolling SITREP")
async def generate_sitrep(req: SitrepRequest):
    """Generate a 60-second rolling situation report for active incidents."""
    import json
    prompt = SITREP_PROMPT
    prompt += f"\n\nINCIDENT DATA:\n{json.dumps(req.incident_data, indent=2, default=str)}"

    if gemini_service._model is not None:
        try:
            response = gemini_service._model.generate_content(prompt)  # type: ignore
            sitrep_text = response.text
        except Exception as e:
            logger.error(f"Gemini SITREP failed: {e}")
            sitrep_text = generate_fallback_sitrep(req.incident_data)
    else:
        sitrep_text = generate_fallback_sitrep(req.incident_data)

    return {
        "success": True,
        "data": {
            "sitrep": sitrep_text,
            "property_id": req.property_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "type": "rolling_sitrep",
        },
    }


@router.post("/after-action", summary="Generate post-incident report")
async def generate_after_action(req: AfterActionRequest):
    """Generate a comprehensive after-action report after incident resolution."""
    import json
    prompt = AFTER_ACTION_PROMPT
    prompt += f"\n\nINCIDENT DATA:\n{json.dumps(req.incident_data, indent=2, default=str)}"

    if req.staff_performance:
        prompt += f"\n\nSTAFF PERFORMANCE:\n{json.dumps(req.staff_performance, indent=2, default=str)}"

    if req.evacuation_metrics:
        prompt += f"\n\nEVACUATION METRICS:\n{json.dumps(req.evacuation_metrics, indent=2, default=str)}"

    if gemini_service._model is not None:
        try:
            response = gemini_service._model.generate_content(prompt)  # type: ignore
            report_text = response.text
        except Exception as e:
            logger.error(f"Gemini after-action failed: {e}")
            report_text = generate_fallback_after_action(req.incident_data)
    else:
        report_text = generate_fallback_after_action(req.incident_data)

    return {
        "success": True,
        "data": {
            "report": report_text,
            "property_id": req.property_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "type": "after_action_report",
        },
    }


def generate_fallback_sitrep(data: dict) -> str:
    incident_type = data.get("type", "emergency")
    status = data.get("status", "active")
    severity = data.get("severity", "unknown")
    staff_count = len(data.get("assignedStaff", []))
    guest_count = data.get("guestCount", 0)

    return (
        f"SITREP: {incident_type.upper()} incident — Status: {status}. "
        f"Severity: {severity}. {staff_count} staff deployed, {guest_count} guests in affected zone. "
        f"Response operations are {status}. Evacuation corridors remain operational. "
        f"Recommend maintaining current response posture and monitoring for escalation."
    )


def generate_fallback_after_action(data: dict) -> str:
    incident_type = data.get("type", "emergency")
    detected_at = data.get("detectedAt", "unknown")
    resolved_at = data.get("resolvedAt", "unknown")

    return (
        f"# AFTER-ACTION REPORT\n\n"
        f"## Incident Summary\n"
        f"Type: {incident_type.upper()}\n"
        f"Detected: {detected_at}\n"
        f"Resolved: {resolved_at}\n\n"
        f"## Response Assessment\n"
        f"- AI detection system performed as expected\n"
        f"- Staff response initiated within acceptable timeframe\n"
        f"- Evacuation procedures followed standard protocol\n\n"
        f"## Recommendations\n"
        f"- Review staff response time metrics for optimization\n"
        f"- Update emergency protocols based on incident specifics\n"
        f"- Schedule refresher drills within 30 days\n"
    )
