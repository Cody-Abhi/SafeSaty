"""
CrisisGuard AI - Pub/Sub Publisher
Publishes confirmed alerts to Google Cloud Pub/Sub for downstream processing.
"""

import json
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

PUBSUB_TOPIC = os.getenv("PUBSUB_TOPIC", "confirmed-alerts")
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "crisisguard-ai")


class PubSubPublisher:
    """
    Publishes messages to Google Cloud Pub/Sub.
    Falls back to local logging if Pub/Sub is not configured.
    """

    _client: Optional[object] = None

    def __init__(self) -> None:
        self._initialize_client()

    def _initialize_client(self) -> None:
        """Attempt to initialize Pub/Sub client."""
        try:
            from google.cloud import pubsub_v1

            self._client = pubsub_v1.PublisherClient()
            self._topic_path = self._client.topic_path(GCP_PROJECT_ID, PUBSUB_TOPIC)  # type: ignore[union-attr]
            logger.info(
                "Pub/Sub publisher initialized",
                extra={"topic": PUBSUB_TOPIC, "project": GCP_PROJECT_ID},
            )
        except Exception as e:
            logger.warning(
                f"Pub/Sub not available — events will be logged locally: {e}"
            )
            self._client = None

    async def publish_alert(self, event_data: dict) -> Optional[str]:
        """
        Publish an alert event to Pub/Sub.

        Args:
            event_data: The emergency event data to publish

        Returns:
            Message ID if published, None if Pub/Sub unavailable
        """
        message_json = json.dumps(event_data, default=str)
        message_bytes = message_json.encode("utf-8")

        if self._client is None:
            # Fallback: log the event locally
            logger.info(
                "📤 [LOCAL] Alert would be published to Pub/Sub",
                extra={
                    "event_id": event_data.get("event_id"),
                    "type": event_data.get("type"),
                    "severity": event_data.get("severity"),
                    "topic": PUBSUB_TOPIC,
                },
            )
            return f"local-{event_data.get('event_id', 'unknown')}"

        try:
            future = self._client.publish(self._topic_path, data=message_bytes)  # type: ignore[union-attr]
            message_id = future.result(timeout=10)

            logger.info(
                "Alert published to Pub/Sub",
                extra={
                    "message_id": message_id,
                    "event_id": event_data.get("event_id"),
                    "topic": PUBSUB_TOPIC,
                },
            )
            return message_id

        except Exception as e:
            logger.error(
                f"Failed to publish to Pub/Sub: {e}",
                extra={
                    "event_id": event_data.get("event_id"),
                    "topic": PUBSUB_TOPIC,
                },
            )
            # Don't lose the alert — log it for manual processing
            logger.error(f"UNPUBLISHED ALERT: {message_json}")
            return None
