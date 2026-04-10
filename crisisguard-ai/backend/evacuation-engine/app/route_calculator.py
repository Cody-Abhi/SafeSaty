"""
CrisisGuard AI - Route Calculator
Modified Dijkstra's for shortest safe evacuation path with dynamic hazard avoidance.
"""

import logging
import time
from typing import Optional

import networkx as nx

from app.graph_builder import PropertyGraph

logger = logging.getLogger(__name__)


class RouteCalculator:
    """
    Computes evacuation routes on a PropertyGraph.
    Uses modified Dijkstra's that dynamically avoids blocked/hazardous paths.
    """

    def __init__(self, property_graph: PropertyGraph) -> None:
        self.pg = property_graph

    def shortest_safe_route(
        self,
        origin: str,
        destination: Optional[str] = None,
        accessible_only: bool = False,
    ) -> dict:
        """
        Find the shortest safe evacuation route from origin to destination.
        If destination is None, finds the nearest exit.
        Returns route details including waypoints, distance, and ETA.
        """
        start = time.perf_counter()
        graph = self.pg.graph

        if origin not in graph:
            return {"success": False, "error": f"Origin node '{origin}' not found"}

        # Determine target exits
        if destination:
            targets = [destination] if destination in graph else []
        else:
            targets = self.pg.get_accessible_exits() if accessible_only else self.pg.get_exits()

        if not targets:
            return {"success": False, "error": "No reachable exits found"}

        # Custom weight function: skip blocked edges
        def weight_fn(u: str, v: str, data: dict) -> float:
            if data.get('blocked', False):
                return float('inf')
            if accessible_only and not data.get('is_accessible', True):
                return float('inf')
            return data.get('weight', 1.0)

        # Find shortest path to nearest exit
        best_path = None
        best_cost = float('inf')
        best_target = None

        for target in targets:
            try:
                path = nx.shortest_path(graph, origin, target, weight=weight_fn)
                cost = nx.shortest_path_length(graph, origin, target, weight=weight_fn)
                if cost < best_cost:
                    best_cost = cost
                    best_path = path
                    best_target = target
            except nx.NetworkXNoPath:
                continue

        elapsed_ms = (time.perf_counter() - start) * 1000

        if best_path is None:
            return {"success": False, "error": "No unblocked path to any exit"}

        # Build waypoint details
        waypoints = []
        total_distance = 0.0
        total_time = 0.0

        for i in range(len(best_path) - 1):
            u, v = best_path[i], best_path[i + 1]
            edge_data = graph[u][v]
            total_distance += edge_data.get('distance', 0)
            total_time += edge_data.get('traversal_time', 0)

            node_data = graph.nodes[v]
            waypoints.append({
                "node_id": v,
                "floor": node_data.get('floor'),
                "zone": node_data.get('zone'),
                "type": node_data.get('node_type'),
                "coordinates": node_data.get('coordinates', {}),
                "cumulative_distance_m": round(total_distance, 1),
                "cumulative_time_s": round(total_time, 1),
            })

        return {
            "success": True,
            "route": {
                "origin": origin,
                "destination": best_target,
                "waypoints": waypoints,
                "total_distance_m": round(total_distance, 1),
                "estimated_time_s": round(total_time, 1),
                "node_count": len(best_path),
                "blocked_paths_avoided": self.pg.blocked_count,
            },
            "computation_ms": round(elapsed_ms, 2),
        }

    def multi_route(
        self,
        origins: list[str],
        accessible_only: bool = False,
    ) -> dict:
        """
        Compute evacuation routes for multiple origins simultaneously.
        Used for mass evacuation scenarios.
        """
        start = time.perf_counter()
        results = []

        for origin in origins:
            result = self.shortest_safe_route(origin, accessible_only=accessible_only)
            results.append(result)

        elapsed_ms = (time.perf_counter() - start) * 1000
        successful = sum(1 for r in results if r.get("success"))

        return {
            "success": True,
            "total_routes": len(origins),
            "successful_routes": successful,
            "failed_routes": len(origins) - successful,
            "routes": results,
            "total_computation_ms": round(elapsed_ms, 2),
        }

    def exit_load_balance(self) -> dict:
        """
        Calculate optimal exit assignment to balance load across all exits.
        Returns exit id -> assigned capacity.
        """
        exits = self.pg.get_exits()
        node_data = {
            ex: self.pg.graph.nodes[ex]
            for ex in exits
            if ex in self.pg.graph
        }

        total_capacity = sum(
            node_data[ex].get('capacity', 100) for ex in exits
        )

        return {
            "exits": [
                {
                    "exit_id": ex,
                    "floor": node_data[ex].get("floor"),
                    "zone": node_data[ex].get("zone"),
                    "capacity": node_data[ex].get("capacity", 100),
                    "share_pct": round(
                        node_data[ex].get("capacity", 100) / total_capacity * 100, 1
                    ) if total_capacity > 0 else 0,
                }
                for ex in exits
            ],
            "total_capacity": total_capacity,
        }
