"""
CrisisGuard AI - Assembly API
Assembly point management endpoints.
"""

import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.assembly_manager import AssemblyManager

logger = logging.getLogger(__name__)
router = APIRouter()

# Global assembly manager instance
_manager = AssemblyManager()

# Pre-register demo assembly points
_manager.register_point("assembly-front", "Front Parking Lot", 500, {"lat": 28.6135, "lng": 77.208})
_manager.register_point("assembly-rear", "Rear Garden", 300, {"lat": 28.6148, "lng": 77.211})
_manager.set_expected_guests(150)


class CheckInRequest(BaseModel):
    point_id: str
    guest_uid: str
    display_name: Optional[str] = None
    method: str = Field(default="app", description="app | qr_scan | staff_manual")


class SetExpectedRequest(BaseModel):
    count: int = Field(..., ge=0)


@router.post("/check-in", summary="Check in a guest at an assembly point")
async def check_in_guest(req: CheckInRequest):
    result = _manager.check_in(
        point_id=req.point_id,
        guest_uid=req.guest_uid,
        method=req.method,
        display_name=req.display_name,
    )
    return result


@router.get("/status", summary="Get all assembly point statuses")
async def get_assembly_status():
    return {"success": True, "data": _manager.get_status()}


@router.post("/expected", summary="Set expected guest count")
async def set_expected_guests(req: SetExpectedRequest):
    _manager.set_expected_guests(req.count)
    return {"success": True, "data": {"expected_guests": req.count}}


@router.post("/unaccounted", summary="Get unaccounted guest UIDs")
async def get_unaccounted(body: dict):
    all_uids = body.get("guest_uids", [])
    unaccounted = _manager.get_unaccounted_uids(all_uids)
    return {
        "success": True,
        "data": {
            "unaccounted": unaccounted,
            "count": len(unaccounted),
        },
    }
