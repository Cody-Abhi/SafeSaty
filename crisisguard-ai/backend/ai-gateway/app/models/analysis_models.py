"""
CrisisGuard AI - Analysis Models
Pydantic models for AI analysis requests and responses.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ThreatLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class AnalysisType(str, Enum):
    IMAGE = "image"
    TEXT = "text"
    AUDIO = "audio"


class ImageAnalysisRequest(BaseModel):
    """Request for CCTV frame / uploaded image analysis."""
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    property_id: str = Field(..., min_length=1)
    camera_id: Optional[str] = None
    zone: Optional[str] = None
    floor: Optional[int] = None
    context: Optional[str] = Field(
        None,
        description="Additional context, e.g. 'hotel lobby camera' or 'pool area'"
    )


class TextAnalysisRequest(BaseModel):
    """Request for text-based threat classification."""
    text: str = Field(..., min_length=1, max_length=5000)
    property_id: str = Field(..., min_length=1)
    source: str = Field(default="guest_message", description="Source: guest_message, staff_report, social_media")
    language: Optional[str] = Field(None, description="ISO language code if known")


class MultilingualRequest(BaseModel):
    """Request for guest message processing (any language)."""
    text: str = Field(..., min_length=1, max_length=2000)
    property_id: str = Field(..., min_length=1)
    target_language: str = Field(default="en")
    guest_uid: Optional[str] = None


class ThreatClassification(BaseModel):
    """AI threat classification result."""
    threat_level: ThreatLevel
    confidence: float = Field(..., ge=0.0, le=1.0)
    emergency_type: Optional[str] = None
    description: str
    recommended_actions: list[str] = Field(default_factory=list)
    detected_objects: list[str] = Field(default_factory=list)
    requires_immediate_action: bool = False


class TextClassificationResult(BaseModel):
    """Result of text analysis."""
    threat_level: ThreatLevel
    confidence: float = Field(..., ge=0.0, le=1.0)
    intent: str  # e.g., "distress", "complaint", "threat", "info_request"
    sentiment: str  # "negative", "neutral", "positive"
    keywords: list[str] = Field(default_factory=list)
    emergency_type: Optional[str] = None
    requires_escalation: bool = False
    summary: str


class TranslationResult(BaseModel):
    """Result of multilingual processing."""
    original_text: str
    detected_language: str
    translated_text: str
    threat_assessment: ThreatClassification
    is_emergency: bool = False
