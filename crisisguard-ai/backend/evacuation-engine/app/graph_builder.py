"""
CrisisGuard AI - Graph Builder
Builds a weighted graph model of a property for evacuation pathfinding.
Nodes = rooms/intersections/exits. Edges = walkable paths.
"""

import logging
from typing import Optional

import networkx as nx

logger = logging.getLogger(__name__)


class PropertyGraph:
    """
    Represents a property's physical layout as a weighted directed graph.
    Edge weights encode: distance, traversal time, accessibility, and current hazard status.
    """

    def __init__(self, property_id: str) -> None:
        self.property_id = property_id
        self.graph = nx.DiGraph()
        self._blocked_edges: set[tuple[str, str]] = set()

    # ─── Node management ──────────────────────────────────

    def add_location(
        self,
        node_id: str,
        floor: int,
        zone: str,
        node_type: str = "room",  # room | corridor | stairwell | elevator | exit | assembly
        is_exit: bool = False,
        is_accessible: bool = True,
        capacity: Optional[int] = None,
        coordinates: Optional[dict] = None,
    ) -> None:
        self.graph.add_node(
            node_id,
            floor=floor,
            zone=zone,
            node_type=node_type,
            is_exit=is_exit,
            is_accessible=is_accessible,
            capacity=capacity,
            coordinates=coordinates or {},
        )

    # ─── Edge management ──────────────────────────────────

    def add_path(
        self,
        from_node: str,
        to_node: str,
        distance_meters: float,
        traversal_seconds: float,
        is_accessible: bool = True,
        bidirectional: bool = True,
    ) -> None:
        weight = self._calculate_weight(distance_meters, traversal_seconds)
        self.graph.add_edge(
            from_node,
            to_node,
            distance=distance_meters,
            traversal_time=traversal_seconds,
            is_accessible=is_accessible,
            base_weight=weight,
            weight=weight,
            blocked=False,
        )
        if bidirectional:
            self.graph.add_edge(
                to_node,
                from_node,
                distance=distance_meters,
                traversal_time=traversal_seconds,
                is_accessible=is_accessible,
                base_weight=weight,
                weight=weight,
                blocked=False,
            )

    # ─── Hazard management ────────────────────────────────

    def block_path(self, from_node: str, to_node: str) -> None:
        """Block a path due to a hazard (fire, structural damage, etc.)."""
        if self.graph.has_edge(from_node, to_node):
            self.graph[from_node][to_node]['blocked'] = True
            self.graph[from_node][to_node]['weight'] = float('inf')
            self._blocked_edges.add((from_node, to_node))
            logger.info(f"Path BLOCKED: {from_node} -> {to_node}")

    def unblock_path(self, from_node: str, to_node: str) -> None:
        """Re-open a previously blocked path."""
        if self.graph.has_edge(from_node, to_node):
            base = self.graph[from_node][to_node]['base_weight']
            self.graph[from_node][to_node]['blocked'] = False
            self.graph[from_node][to_node]['weight'] = base
            self._blocked_edges.discard((from_node, to_node))
            logger.info(f"Path UNBLOCKED: {from_node} -> {to_node}")

    def apply_congestion(self, from_node: str, to_node: str, factor: float) -> None:
        """
        Increase weight due to crowd density.
        factor: 1.0 = normal, 2.0 = 2x slower (crowded), etc.
        """
        if self.graph.has_edge(from_node, to_node):
            base = self.graph[from_node][to_node]['base_weight']
            self.graph[from_node][to_node]['weight'] = base * max(1.0, factor)

    # ─── Queries ──────────────────────────────────────────

    def get_exits(self, floor: Optional[int] = None) -> list[str]:
        exits = [
            n for n, d in self.graph.nodes(data=True)
            if d.get('is_exit', False)
        ]
        if floor is not None:
            exits = [n for n in exits if self.graph.nodes[n].get('floor') == floor]
        return exits

    def get_accessible_exits(self) -> list[str]:
        return [
            n for n, d in self.graph.nodes(data=True)
            if d.get('is_exit') and d.get('is_accessible')
        ]

    @property
    def blocked_count(self) -> int:
        return len(self._blocked_edges)

    # ─── Internal ─────────────────────────────────────────

    @staticmethod
    def _calculate_weight(distance: float, time: float) -> float:
        """Composite weight: 60% distance + 40% time (normalized)."""
        return 0.6 * distance + 0.4 * (time * 1.2)


def build_demo_property() -> PropertyGraph:
    """
    Build a demonstration property graph for testing.
    Simulates a 5-floor hotel with corridors, stairwells, and exits.
    """
    pg = PropertyGraph("hotel-grand-001")

    for floor in range(1, 6):
        prefix = f"F{floor}"

        # Corridor nodes
        pg.add_location(f"{prefix}-corridor-east", floor, "east_wing", "corridor")
        pg.add_location(f"{prefix}-corridor-west", floor, "west_wing", "corridor")
        pg.add_location(f"{prefix}-corridor-central", floor, "central", "corridor")

        # Room clusters (simplified — one node per wing per floor)
        for wing in ["east", "west"]:
            for room in range(1, 4):
                room_id = f"{prefix}-room-{wing}-{room:02d}"
                pg.add_location(room_id, floor, f"{wing}_wing", "room")
                corridor = f"{prefix}-corridor-{wing}"
                pg.add_path(room_id, corridor, distance_meters=8.0, traversal_seconds=6.0)

        # Connect corridors
        pg.add_path(f"{prefix}-corridor-east", f"{prefix}-corridor-central", 15.0, 12.0)
        pg.add_path(f"{prefix}-corridor-west", f"{prefix}-corridor-central", 15.0, 12.0)

        # Stairwells (connecting floors)
        pg.add_location(f"{prefix}-stair-east", floor, "east_wing", "stairwell")
        pg.add_location(f"{prefix}-stair-west", floor, "west_wing", "stairwell")
        pg.add_path(f"{prefix}-corridor-east", f"{prefix}-stair-east", 5.0, 4.0)
        pg.add_path(f"{prefix}-corridor-west", f"{prefix}-stair-west", 5.0, 4.0)

        if floor > 1:
            prev = f"F{floor - 1}"
            pg.add_path(f"{prefix}-stair-east", f"{prev}-stair-east", 4.0, 8.0)
            pg.add_path(f"{prefix}-stair-west", f"{prev}-stair-west", 4.0, 8.0)

    # Ground floor exits
    pg.add_location("exit-main", 1, "central", "exit", is_exit=True)
    pg.add_location("exit-east", 1, "east_wing", "exit", is_exit=True)
    pg.add_location("exit-west", 1, "west_wing", "exit", is_exit=True)
    pg.add_path("F1-corridor-central", "exit-main", 10.0, 8.0)
    pg.add_path("F1-corridor-east", "exit-east", 8.0, 6.0)
    pg.add_path("F1-corridor-west", "exit-west", 8.0, 6.0)

    # Assembly points
    pg.add_location("assembly-front", 0, "exterior", "assembly", is_exit=False, capacity=500)
    pg.add_location("assembly-rear", 0, "exterior", "assembly", is_exit=False, capacity=300)
    pg.add_path("exit-main", "assembly-front", 30.0, 20.0)
    pg.add_path("exit-east", "assembly-front", 40.0, 25.0)
    pg.add_path("exit-west", "assembly-rear", 25.0, 18.0)

    logger.info(
        f"Demo property built: {pg.graph.number_of_nodes()} nodes, "
        f"{pg.graph.number_of_edges()} edges, {len(pg.get_exits())} exits"
    )
    return pg
