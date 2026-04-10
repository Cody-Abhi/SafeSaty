"""
CrisisGuard AI - Gemini Chat Router
Emergency AI assistant using Gemini 2.0 with crisis-specific system prompt.
Supports streaming responses and multimodal input.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services.gemini_service import GeminiService

logger = logging.getLogger(__name__)
router = APIRouter()
gemini_service = GeminiService()

CRISIS_SYSTEM_PROMPT = """You are CrisisGuard AI, an emergency response assistant for hotel and resort guests.

CRITICAL RULES:
1. Always prioritize human safety above all else.
2. Give clear, concise, actionable instructions.
3. Never tell people to stay in place if there is an active fire or structural threat.
4. Default to "evacuate via nearest marked exit" if uncertain.
5. For medical emergencies, provide basic first aid guidance until professionals arrive.
6. Remain calm and reassuring in tone.
7. If asked about something non-emergency-related, briefly redirect to staying safe.
8. You speak 40+ languages — respond in the guest's language.
9. Never give legal or definitive medical diagnoses.
10. Always recommend contacting local emergency services (911/112).

AVAILABLE CONTEXT:
- You have access to the property floor plan data.
- You know the current active incidents.
- You can provide evacuation route guidance.
"""


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    property_id: str = Field(..., min_length=1)
    incident_id: Optional[str] = None
    guest_uid: Optional[str] = None
    language: Optional[str] = None
    context: Optional[str] = Field(None, description="Active incident context for grounding")


class ChatResponse(BaseModel):
    response: str
    language: str
    is_emergency_advice: bool
    suggested_actions: list[str]


@router.post("/chat", summary="Emergency AI assistant chat")
async def emergency_chat(req: ChatRequest):
    """Gemini-powered emergency assistant. Responds with crisis-appropriate guidance."""
    prompt = CRISIS_SYSTEM_PROMPT

    if req.context:
        prompt += f"\n\nCURRENT SITUATION:\n{req.context}"

    if req.language:
        prompt += f"\n\nRespond in: {req.language}"

    prompt += f"\n\nGUEST MESSAGE:\n{req.message}"

    if gemini_service._model is not None:
        try:
            response = gemini_service._model.generate_content(prompt)  # type: ignore
            response_text = response.text
        except Exception as e:
            logger.error(f"Gemini chat failed: {e}")
            response_text = generate_fallback_response(req.message)
    else:
        response_text = generate_fallback_response(req.message)

    return {
        "success": True,
        "data": {
            "response": response_text,
            "language": req.language or "en",
            "is_emergency_advice": True,
            "suggested_actions": [
                "Follow illuminated exit signs",
                "Do not use elevators",
                "Proceed to nearest assembly point",
            ],
            "responded_at": datetime.now(timezone.utc).isoformat(),
        },
    }


def generate_fallback_response(message: str) -> str:
    """Basic safety-first fallback when Gemini is unavailable."""
    msg_lower = message.lower()

    if any(word in msg_lower for word in ['fire', 'smoke', 'burning']):
        return (
            "🔥 FIRE SAFETY: Leave the building immediately via the nearest marked exit. "
            "Do NOT use elevators. Stay low if there is smoke. "
            "Once outside, proceed to the assembly point in the front parking area. "
            "If your path is blocked, return to your room, close the door, place wet towels under it, "
            "and signal from the window. Help is on the way."
        )
    elif any(word in msg_lower for word in ['medical', 'hurt', 'injured', 'bleeding', 'heart']):
        return (
            "🏥 MEDICAL EMERGENCY: Stay calm. Do not move the injured person unless they are in immediate danger. "
            "Apply pressure to any bleeding wounds with a clean cloth. "
            "If the person is unconscious but breathing, place them in the recovery position. "
            "Emergency medical staff have been notified and are responding."
        )
    elif any(word in msg_lower for word in ['gun', 'shooter', 'weapon', 'attack', 'threat']):
        return (
            "🛡️ SECURITY ALERT: RUN, HIDE, FIGHT — in that order. "
            "If you can safely exit, do so immediately. Run away from the threat. "
            "If you cannot exit, find a room, lock/barricade the door, silence your phone, hide. "
            "Only as an absolute last resort, be prepared to defend yourself. "
            "Law enforcement has been notified."
        )
    else:
        return (
            "⚠️ For your safety, please follow these general guidelines: "
            "Stay calm and be aware of your surroundings. "
            "Follow any instructions from hotel staff or the emergency notification system. "
            "If you need immediate help, use the SOS button in the app or call the front desk."
        )
