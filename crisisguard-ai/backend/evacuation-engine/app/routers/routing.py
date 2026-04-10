"""
CrisisGuard AI - Routing API
Evacuation route calculation endpoints.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.graph_builder import build_demo_property
from app.route_calculator import RouteCalculator

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize demo property graph + calculator
_property_graph = build_demo_property()
_calculator = RouteCalculator(_property_graph)


class SingleRouteRequest(BaseModel):
    origin: str = Field(..., description="Starting node ID, e.g. 'F3-room-east-02'")
    destination: Optional[str] = Field(None, description="Target node ID. If null, finds nearest exit.")
    accessible_only: bool = Field(False, description="Only use wheelchair-accessible paths")


class MultiRouteRequest(BaseModel):
    origins: list[str] = Field(..., description="List of starting node IDs")
    accessible_only: bool = False


class BlockPathRequest(BaseModel):
    from_node: str
    to_node: str


class CongestionRequest(BaseModel):
    from_node: str
    to_node: str
    factor: float = Field(..., ge=1.0, le=10.0)


@router.post("/route", summary="Calculate single evacuation route")
async def calculate_route(req: SingleRouteRequest):
    result = _calculator.shortest_safe_route(
        origin=req.origin,
        destination=req.destination,
        accessible_only=req.accessible_only,
    )
    if not result.get("success"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result.get("error"))
    return {"success": True, "data": result}


@router.post("/route/batch", summary="Calculate routes for multiple origins")
async def calculate_batch_routes(req: MultiRouteRequest):
    result = _calculator.multi_route(
        origins=req.origins,
        accessible_only=req.accessible_only,
    )
    return {"success": True, "data": result}


@router.post("/hazard/block", summary="Block a path due to hazard")
async def block_path(req: BlockPathRequest):
    _property_graph.block_path(req.from_node, req.to_node)
    return {
        "success": True,
        "data": {
            "blocked": f"{req.from_node} -> {req.to_node}",
            "total_blocked": _property_graph.blocked_count,
        },
    }


@router.post("/hazard/unblock", summary="Unblock a previously blocked path")
async def unblock_path(req: BlockPathRequest):
    _property_graph.unblock_path(req.from_node, req.to_node)
    return {
        "success": True,
        "data": {
            "unblocked": f"{req.from_node} -> {req.to_node}",
            "total_blocked": _property_graph.blocked_count,
        },
    }


@router.post("/hazard/congestion", summary="Apply congestion factor to a path")
async def apply_congestion(req: CongestionRequest):
    _property_graph.apply_congestion(req.from_node, req.to_node, req.factor)
    return {
        "success": True,
        "data": {"path": f"{req.from_node} -> {req.to_node}", "factor": req.factor},
    }


@router.get("/exits", summary="List all exits")
async def list_exits(floor: Optional[int] = None):
    exits = _property_graph.get_exits(floor=floor)
    return {"success": True, "data": {"exits": exits, "count": len(exits)}}


@router.get("/load-balance", summary="Get exit load balancing plan")
async def exit_load_balance():
    result = _calculator.exit_load_balance()
    return {"success": True, "data": result}
