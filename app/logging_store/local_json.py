import json
from datetime import datetime, timezone
from pathlib import Path

from app.logging_store.base import BaseEventLogger


class LocalJsonEventLogger(BaseEventLogger):
    """
    Beginner-friendly logger that writes events to a local JSON file.

    This keeps the first prototype light while preserving a clean interface
    for a later Elasticsearch-backed version.
    """

    def __init__(self, storage_path: str) -> None:
        self.storage_path = Path(storage_path)
        self._ensure_storage_file()

    def log_search(self, event: dict) -> None:
        payload = {
            **event,
            "event_type": "search",
            "timestamp": self._utc_timestamp(),
        }
        data = self._read()
        data["search_events"].append(payload)
        self._write(data)

    def log_click(self, event: dict) -> None:
        payload = {
            **event,
            "event_type": "click",
            "timestamp": self._utc_timestamp(),
        }
        data = self._read()
        data["click_events"].append(payload)
        self._write(data)

    def log_return(self, event: dict) -> None:
        payload = {
            **event,
            "event_type": "return",
            "timestamp": self._utc_timestamp(),
        }
        data = self._read()
        data["return_events"].append(payload)
        self._write(data)

    def log_chat(self, event: dict) -> None:
        payload = {
            **event,
            "event_type": "chat",
            "timestamp": self._utc_timestamp(),
        }
        data = self._read()
        data["chat_events"].append(payload)
        self._write(data)

    def get_all_events(self) -> dict:
        return self._read()

    def _ensure_storage_file(self) -> None:
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.storage_path.exists():
            self._write(
                {
                    "search_events": [],
                    "click_events": [],
                    "return_events": [],
                    "chat_events": [],
                }
            )

    def _read(self) -> dict:
        with self.storage_path.open("r", encoding="utf-8") as file:
            data = json.load(file)
            data.setdefault("search_events", [])
            data.setdefault("click_events", [])
            data.setdefault("return_events", [])
            data.setdefault("chat_events", [])
            return data

    def _write(self, data: dict) -> None:
        with self.storage_path.open("w", encoding="utf-8") as file:
            json.dump(data, file, indent=2)

    def _utc_timestamp(self) -> str:
        return datetime.now(timezone.utc).isoformat()
