"""
CrisisGuard AI - Gemini Service
Google Gemini integration for threat analysis.
Uses structured output for reliable JSON classification.
"""

import json
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")


# System prompts for different analysis types
IMAGE_ANALYSIS_PROMPT = """You are a security AI system for a hotel/resort property.
Analyze the provided image for any safety threats or emergencies.

Classify the threat level as one of: critical, high, medium, low, none

For each detected threat, provide:
1. threat_level: The severity (critical/high/medium/low/none)
2. confidence: Your confidence score (0.0 to 1.0)
3. emergency_type: The type of emergency if applicable (fire, medical, security, hazard, null)
4. description: Brief description of what you observe
5. recommended_actions: List of recommended response actions
6. detected_objects: Key objects/situations detected in the image
7. requires_immediate_action: Boolean - does this need immediate human response?

Respond ONLY with valid JSON matching this schema:
{
  "threat_level": "none|low|medium|high|critical",
  "confidence": 0.95,
  "emergency_type": null,
  "description": "...",
  "recommended_actions": [],
  "detected_objects": [],
  "requires_immediate_action": false
}"""

TEXT_ANALYSIS_PROMPT = """You are a safety analysis AI for a hospitality environment.
Analyze the following text for any safety concerns, threats, or emergency situations.

Classify and respond with JSON matching this schema:
{
  "threat_level": "none|low|medium|high|critical",
  "confidence": 0.95,
  "intent": "distress|complaint|threat|info_request|emergency|routine",
  "sentiment": "negative|neutral|positive",
  "keywords": ["list", "of", "key", "words"],
  "emergency_type": null,
  "requires_escalation": false,
  "summary": "Brief summary of the text and its implications"
}"""

TRANSLATION_PROMPT = """You are a multilingual safety assistant for hotels.
Process the following message:
1. Detect the language
2. Translate to {target_language}
3. Assess if it contains any emergency or safety concern

Respond with JSON:
{{
  "detected_language": "xx",
  "translated_text": "...",
  "is_emergency": false,
  "threat_assessment": {{
    "threat_level": "none|low|medium|high|critical",
    "confidence": 0.9,
    "emergency_type": null,
    "description": "...",
    "recommended_actions": [],
    "detected_objects": [],
    "requires_immediate_action": false
  }}
}}"""


class GeminiService:
    """
    Google Gemini API integration.
    Falls back to rule-based analysis when API key is not configured.
    """

    def __init__(self) -> None:
        self._client: Optional[object] = None
        self._model: Optional[object] = None
        self._initialize()

    def _initialize(self) -> None:
        if not GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not set — using fallback analysis")
            return

        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            self._model = genai.GenerativeModel(GEMINI_MODEL)
            logger.info(f"Gemini service initialized with model: {GEMINI_MODEL}")
        except ImportError:
            logger.warning("google-generativeai not installed — using fallback analysis")
        except Exception as e:
            logger.error(f"Gemini initialization failed: {e}")

    async def analyze_image(
        self,
        image_url: Optional[str] = None,
        image_base64: Optional[str] = None,
        context: Optional[str] = None,
    ) -> dict:
        """Analyze an image for threats using Gemini Vision."""
        if self._model is None:
            return self._fallback_image_analysis()

        try:
            import google.generativeai as genai

            parts = [IMAGE_ANALYSIS_PROMPT]
            if context:
                parts.append(f"\nContext: {context}")

            if image_base64:
                image_part = {
                    "mime_type": "image/jpeg",
                    "data": image_base64,
                }
                parts.append(image_part)
            elif image_url:
                parts.append(f"\nImage URL: {image_url}")

            response = self._model.generate_content(parts)  # type: ignore[union-attr]
            result_text = response.text

            # Parse JSON from response
            return self._parse_json_response(result_text)
        except Exception as e:
            logger.error(f"Gemini image analysis failed: {e}")
            return self._fallback_image_analysis()

    async def analyze_text(self, text: str, source: str = "guest_message") -> dict:
        """Analyze text for threats using Gemini."""
        if self._model is None:
            return self._fallback_text_analysis(text)

        try:
            prompt = f"{TEXT_ANALYSIS_PROMPT}\n\nSource: {source}\nText to analyze:\n\"{text}\""
            response = self._model.generate_content(prompt)  # type: ignore[union-attr]
            return self._parse_json_response(response.text)
        except Exception as e:
            logger.error(f"Gemini text analysis failed: {e}")
            return self._fallback_text_analysis(text)

    async def translate_and_assess(
        self, text: str, target_language: str = "en"
    ) -> dict:
        """Translate text and assess for emergency content."""
        if self._model is None:
            return self._fallback_translation(text, target_language)

        try:
            prompt = TRANSLATION_PROMPT.format(target_language=target_language)
            prompt += f'\n\nMessage to process:\n"{text}"'
            response = self._model.generate_content(prompt)  # type: ignore[union-attr]
            return self._parse_json_response(response.text)
        except Exception as e:
            logger.error(f"Gemini translation failed: {e}")
            return self._fallback_translation(text, target_language)

    def _parse_json_response(self, text: str) -> dict:
        """Extract JSON from Gemini response (handles markdown code blocks)."""
        clean = text.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        if clean.startswith("```"):
            clean = clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        return json.loads(clean.strip())

    # ─── Fallback Analysis (when Gemini is unavailable) ─────

    def _fallback_image_analysis(self) -> dict:
        return {
            "threat_level": "none",
            "confidence": 0.5,
            "emergency_type": None,
            "description": "AI analysis unavailable — manual review recommended",
            "recommended_actions": ["Manual review of camera feed required"],
            "detected_objects": [],
            "requires_immediate_action": False,
        }

    def _fallback_text_analysis(self, text: str) -> dict:
        """Basic keyword-based fallback analysis."""
        text_lower = text.lower()
        emergency_keywords = ["fire", "help", "emergency", "gun", "weapon", "bomb", "hurt", "bleeding", "attack"]
        distress_keywords = ["scared", "afraid", "danger", "threat", "unsafe"]

        found_emergency = [kw for kw in emergency_keywords if kw in text_lower]
        found_distress = [kw for kw in distress_keywords if kw in text_lower]

        if found_emergency:
            return {
                "threat_level": "high",
                "confidence": 0.6,
                "intent": "emergency",
                "sentiment": "negative",
                "keywords": found_emergency,
                "emergency_type": "security" if any(w in text_lower for w in ["gun", "weapon", "attack"]) else "general",
                "requires_escalation": True,
                "summary": f"Emergency keywords detected: {', '.join(found_emergency)}. Manual review advised.",
            }
        elif found_distress:
            return {
                "threat_level": "medium",
                "confidence": 0.5,
                "intent": "distress",
                "sentiment": "negative",
                "keywords": found_distress,
                "emergency_type": None,
                "requires_escalation": True,
                "summary": f"Distress indicators: {', '.join(found_distress)}. Staff follow-up recommended.",
            }
        else:
            return {
                "threat_level": "none",
                "confidence": 0.7,
                "intent": "routine",
                "sentiment": "neutral",
                "keywords": [],
                "emergency_type": None,
                "requires_escalation": False,
                "summary": "No safety concerns detected in text.",
            }

    def _fallback_translation(self, text: str, target_language: str) -> dict:
        return {
            "detected_language": "unknown",
            "translated_text": text,
            "is_emergency": False,
            "threat_assessment": self._fallback_image_analysis(),
        }
