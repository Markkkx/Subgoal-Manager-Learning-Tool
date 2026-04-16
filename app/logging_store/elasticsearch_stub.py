from datetime import datetime, timezone

from app.logging_store.base import BaseEventLogger


class ElasticsearchEventLogger(BaseEventLogger):
    """
    Elasticsearch-backed logger for research events.

    The rest of the app only depends on the logger interface, so this can be
    swapped with the local JSON implementation without changing the routes.
    """

    def __init__(self, client, index_name: str = "behavior-events") -> None:
        self.client = client
        self.index_name = index_name

    def log_search(self, event: dict) -> None:
        payload = self._build_payload(event, "search")
        self.client.index(index=self.index_name, document=payload)

    def log_click(self, event: dict) -> None:
        payload = self._build_payload(event, "click")
        self.client.index(index=self.index_name, document=payload)

    def log_return(self, event: dict) -> None:
        payload = self._build_payload(event, "return")
        self.client.index(index=self.index_name, document=payload)

    def log_chat(self, event: dict) -> None:
        payload = self._build_payload(event, "chat")
        self.client.index(index=self.index_name, document=payload)

    def get_all_events(self) -> dict:
        response = self.client.search(
            index=self.index_name,
            size=100,
            sort=[{"timestamp": {"order": "desc"}}],
            query={"match_all": {}},
        )
        hits = response.get("hits", {}).get("hits", [])
        return {"events": [hit.get("_source", {}) for hit in hits]}

    def _build_payload(self, event: dict, event_type: str) -> dict:
        return {
            **event,
            "event_type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
