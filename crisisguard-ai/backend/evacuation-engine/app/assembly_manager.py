"""
CrisisGuard AI - Assembly Point Manager
Tracks assembly point check-ins and headcount during evacuations.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class CheckIn(BaseModel):
    guest_uid: str
    display_name: Optional[str] = None
    method: str = Field(default="app", description="app | qr_scan | staff_manual")
    checked_in_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AssemblyPoint(BaseModel):
    point_id: str
    name: str
    capacity: int
    coordinates: dict = Field(default_factory=dict)
    checked_in: list[CheckIn] = Field(default_factory=list)

    @property
    def current_count(self) -> int:
        return len(self.checked_in)

    @property
    def utilization_pct(self) -> float:
        return round(self.current_count / self.capacity * 100, 1) if self.capacity > 0 else 0.0


class AssemblyManager:
    """Manages assembly point state during an evacuation event."""

    def __init__(self) -> None:
        self._points: dict[str, AssemblyPoint] = {}
        self._expected_guests: int = 0

    def register_point(
        self,
        point_id: str,
        name: str,
        capacity: int,
        coordinates: Optional[dict] = None,
    ) -> AssemblyPoint:
        point = AssemblyPoint(
            point_id=point_id,
            name=name,
            capacity=capacity,
            coordinates=coordinates or {},
        )
        self._points[point_id] = point
        logger.info(f"Assembly point registered: {name} (capacity: {capacity})")
        return point

    def set_expected_guests(self, count: int) -> None:
        self._expected_guests = count

    def check_in(self, point_id: str, guest_uid: str, method: str = "app", display_name: Optional[str] = None) -> dict:
        point = self._points.get(point_id)
        if not point:
            return {"success": False, "error": f"Assembly point '{point_id}' not found"}

        # Prevent double check-in
        if any(c.guest_uid == guest_uid for c in point.checked_in):
            return {"success": False, "error": "Guest already checked in at this point"}

        # Remove from other points (transfer)
        for other in self._points.values():
            if other.point_id != point_id:
                other.checked_in = [c for c in other.checked_in if c.guest_uid != guest_uid]

        check_in = CheckIn(guest_uid=guest_uid, display_name=display_name, method=method)
        point.checked_in.append(check_in)

        logger.info(f"Check-in: {guest_uid} at {point.name} via {method}")

        return {
            "success": True,
            "point_id": point_id,
            "current_count": point.current_count,
            "capacity": point.capacity,
        }

    def get_status(self) -> dict:
        total_checked_in = sum(p.current_count for p in self._points.values())
        unaccounted = max(0, self._expected_guests - total_checked_in)

        return {
            "expected_guests": self._expected_guests,
            "total_checked_in": total_checked_in,
            "unaccounted": unaccounted,
            "accounted_pct": round(
                total_checked_in / self._expected_guests * 100, 1
            ) if self._expected_guests > 0 else 0.0,
            "points": [
                {
                    "point_id": p.point_id,
                    "name": p.name,
                    "capacity": p.capacity,
                    "current_count": p.current_count,
                    "utilization_pct": p.utilization_pct,
                }
                for p in self._points.values()
            ],
        }

    def get_unaccounted_uids(self, all_guest_uids: list[str]) -> list[str]:
        """Return guest UIDs that have NOT checked in at any assembly point."""
        checked_in_uids = set()
        for point in self._points.values():
            for check in point.checked_in:
                checked_in_uids.add(check.guest_uid)
        return [uid for uid in all_guest_uids if uid not in checked_in_uids]
