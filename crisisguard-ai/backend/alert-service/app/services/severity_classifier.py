"""
CrisisGuard AI - Severity Classifier
Rules-based severity classification for emergency alerts.
Maps emergency types/subtypes to severity levels per the PRD specification.
"""

import logging
from app.models.alert_models import EmergencyType, Severity

logger = logging.getLogger(__name__)

# Severity mapping: emergency type -> severity level
SEVERITY_MAP: dict[str, Severity] = {
    # Critical (P0): Life-threatening, immediate evacuation
    "fire": Severity.CRITICAL,
    "active_shooter": Severity.CRITICAL,
    "structural_collapse": Severity.CRITICAL,
    "explosion": Severity.CRITICAL,

    # High (P1): Serious, immediate response needed
    "medical": Severity.HIGH,
    "medical_emergency": Severity.HIGH,
    "bomb_threat": Severity.HIGH,
    "severe_weather": Severity.HIGH,
    "security": Severity.HIGH,

    # Medium (P2): Concerning, dispatched response
    "suspicious_package": Severity.MEDIUM,
    "minor_injury": Severity.MEDIUM,
    "elevator_entrapment": Severity.MEDIUM,

    # Low (P3): Monitoring, logged for review
    "safety_hazard": Severity.LOW,
    "noise_complaint": Severity.LOW,
    "equipment_malfunction": Severity.LOW,
    "hazard": Severity.LOW,
}


class SeverityClassifier:
    """Classifies alert severity based on emergency type and context."""

    def classify(
        self,
        emergency_type: EmergencyType,
        silent: bool = False,
        battery_level: int | None = None,
    ) -> Severity:
        """
        Determine severity level.

        Args:
            emergency_type: The type of emergency reported
            silent: If True, may indicate a hostage / active threat situation
            battery_level: Device battery %. Low battery escalates priority.

        Returns:
            Classified severity level
        """
        # Look up base severity from the map
        base_severity = SEVERITY_MAP.get(emergency_type.value, Severity.MEDIUM)

        # Silent alerts escalate: a silent SOS likely means the user can't safely make noise
        if silent and base_severity in (Severity.LOW, Severity.MEDIUM):
            escalated = Severity.HIGH
            logger.info(
                "Severity escalated due to silent mode",
                extra={
                    "original": base_severity.value,
                    "escalated": escalated.value,
                    "type": emergency_type.value,
                },
            )
            return escalated

        # Very low battery (<5%) escalates — user may lose connectivity soon
        if battery_level is not None and battery_level < 5:
            if base_severity == Severity.LOW:
                escalated = Severity.MEDIUM
                logger.info(
                    "Severity escalated due to low battery",
                    extra={
                        "battery": battery_level,
                        "original": base_severity.value,
                        "escalated": escalated.value,
                    },
                )
                return escalated

        return base_severity
