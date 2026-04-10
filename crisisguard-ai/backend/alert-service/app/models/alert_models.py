"""
CrisisGuard AI - Alert Models
Pydantic models for alert validation.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class EmergencyType(str, Enum):
    FIRE = "fire"
    MEDICAL = "medical"
    SECURITY = "security"
    GENERAL = "general"
    NATURAL_DISASTER = "natural_disaster"
    HAZARD = "hazard"


class AlertSource(str, Enum):
    GUEST_SOS = "guest_sos"
    STAFF_REPORT = "staff_report"
    AI_CCTV = "ai_cctv"
    AI_AUDIO = "ai_audio"
    AI_TEXT = "ai_text"


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IncidentStatus(str, Enum):
    DETECTED = "detected"
    CONFIRMED = "confirmed"
    RESPONDING = "responding"
    RESOLVED = "resolved"
    FALSE_ALARM = "false_alarm"


class GeoCoordinates(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class AlertLocation(BaseModel):
    coordinates: GeoCoordinates
    floor: int = Field(..., ge=-10, le=200)
    zone: str = Field(..., min_length=1, max_length=100)
    room_number: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = Field(None, max_length=500)


class SOSPayload(BaseModel):
    """Incoming SOS alert payload from mobile app."""
    type: EmergencyType
    source: AlertSource = AlertSource.GUEST_SOS
    guest_uid: str = Field(..., min_length=1, max_length=128)
    property_id: str = Field(..., min_length=1, max_length=128)
    location: AlertLocation
    timestamp: str = Field(...)
    device_battery: Optional[int] = Field(None, ge=0, le=100)
    locale: str = Field(default="en", max_length=10)
    silent: bool = Field(default=False)
    attachments: Optional[list[str]] = Field(default=None)


class AlertResponse(BaseModel):
    """Response after alert submission."""
    success: bool
    event_id: str
    severity: Severity
    status: IncidentStatus
    message: str
    timestamp: str


class EmergencyEvent(BaseModel):
    """Full emergency event stored in Firestore."""
    event_id: str
    property_id: str
    type: EmergencyType
    severity: Severity
    status: IncidentStatus
    source: AlertSource
    location: AlertLocation
    detected_at: str
    confirmed_at: Optional[str] = None
    resolved_at: Optional[str] = None
    assigned_staff: list[str] = Field(default_factory=list)
    guest_count: int = Field(default=0)
    guest_uid: Optional[str] = None
    silent: bool = False
    metadata: dict = Field(default_factory=dict)
