from typing import Any

import requests


class SearchService:
    """Thin wrapper around SerpAPI so the backend route stays simple."""

    def __init__(self, api_key: str, engine: str = "google") -> None:
        self.api_key = api_key
        self.engine = engine
        self.base_url = "https://serpapi.com/search.json"

    def search(self, query_text: str) -> list[dict[str, Any]]:
        if not self.api_key:
            raise ValueError(
                "SERPAPI_KEY is missing. Add it to your .env file before running searches."
            )

        response = requests.get(
            self.base_url,
            params={
                "q": query_text,
                "engine": self.engine,
                "api_key": self.api_key,
            },
            timeout=20,
        )

        if response.status_code != 200:
            raise RuntimeError(
                f"SerpAPI request failed with status {response.status_code}: {response.text}"
            )

        data = response.json()
        organic_results = data.get("organic_results", [])

        normalized_results: list[dict[str, Any]] = []
        for index, item in enumerate(organic_results, start=1):
            normalized_results.append(
                {
                    "rank": index,
                    "title": item.get("title", "Untitled result"),
                    "url": item.get("link", ""),
                    "snippet": item.get("snippet", "No snippet available."),
                }
            )

        return normalized_results
