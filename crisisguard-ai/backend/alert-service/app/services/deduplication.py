"""
CrisisGuard AI - Deduplication Service
Prevents duplicate alerts from the same user within a configurable time window.
Uses in-memory storage with periodic cleanup for the MVP.
In production, this would use Redis for cross-instance dedup.
"""

import asyncio
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)

# Default deduplication window: 30 seconds
DEDUP_WINDOW_SECONDS = 30


class DeduplicationService:
    """
    In-memory deduplication with sliding window.
    Key = "{user_uid}:{emergency_type}" to allow different alert types from same user.
    """

    _instance: Optional["DeduplicationService"] = None
    _alert_cache: dict[str, float] = {}
    _cleanup_task: Optional[asyncio.Task] = None  # type: ignore[type-arg]

    def __new__(cls) -> "DeduplicationService":
        """Singleton pattern."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def is_duplicate(self, user_uid: str, alert_type: str) -> bool:
        """
        Check if this alert is a duplicate.

        Returns True if the same user sent the same alert type
        within the dedup window.
        """
        key = f"{user_uid}:{alert_type}"
        now = time.time()

        last_alert_time = self._alert_cache.get(key)

        if last_alert_time is not None:
            elapsed = now - last_alert_time
            if elapsed < DEDUP_WINDOW_SECONDS:
                logger.info(
                    "Duplicate alert suppressed",
                    extra={
                        "user_uid": user_uid,
                        "alert_type": alert_type,
                        "elapsed_seconds": round(elapsed, 1),
                        "window_seconds": DEDUP_WINDOW_SECONDS,
                    },
                )
                return True

        # Record this alert
        self._alert_cache[key] = now
        return False

    def _cleanup_expired(self) -> int:
        """Remove expired entries from cache. Returns count of removed entries."""
        now = time.time()
        expired_keys = [
            key
            for key, timestamp in self._alert_cache.items()
            if now - timestamp > DEDUP_WINDOW_SECONDS
        ]
        for key in expired_keys:
            del self._alert_cache[key]

        if expired_keys:
            logger.debug(f"Cleaned up {len(expired_keys)} expired dedup entries")

        return len(expired_keys)

    def start_cleanup_task(self) -> None:
        """Start periodic cleanup of expired cache entries."""

        async def _periodic_cleanup() -> None:
            while True:
                await asyncio.sleep(60)  # Clean up every 60 seconds
                self._cleanup_expired()

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                self._cleanup_task = asyncio.ensure_future(_periodic_cleanup())
            else:
                self._cleanup_task = loop.create_task(_periodic_cleanup())
        except RuntimeError:
            logger.debug("No event loop available for cleanup task")

    def stop_cleanup_task(self) -> None:
        """Stop the cleanup task."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            self._cleanup_task = None

    def get_cache_size(self) -> int:
        """Return current cache size for monitoring."""
        return len(self._alert_cache)
