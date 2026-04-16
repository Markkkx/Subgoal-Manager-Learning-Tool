from typing import Any

import requests


class ChatService:
    """
    Small wrapper around Groq's chat completions API.

    The frontend sends conversation history to the backend, and this service
    turns that history into a single assistant reply.
    """

    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model = model
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    def is_enabled(self) -> bool:
        return bool(self.api_key)

    def summarize_search(self, query_text: str, results: list[dict[str, Any]]) -> str | None:
        """
        Builds a concise summary based on the user's search query and returned results.

        If Groq is not configured, the UI can still work without this feature.
        """
        if not self.is_enabled():
            return None

        result_lines = []
        for result in results[:5]:
            result_lines.append(
                "- Title: {title}\n  URL: {url}\n  Snippet: {snippet}".format(
                    title=result["title"],
                    url=result["url"],
                    snippet=result["snippet"],
                )
            )

        prompt = (
            "You are assisting a learner inside a research demo website.\n"
            "Write a short, neutral summary of what the search results suggest about the query.\n"
            "Use 3 to 5 sentences.\n"
            "Do not invent facts that are not supported by the provided results.\n\n"
            "Query: {query}\n\n"
            "Top results:\n{results}"
        ).format(query=query_text, results="\n".join(result_lines))

        return self._create_chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": "You write clear, factual summaries for learners.",
                },
                {"role": "user", "content": prompt},
            ]
        )

    def extract_keywords(self, query_text: str) -> list[str]:
        """
        Extracts a few concise keywords from the latest traditional search query.

        The output is normalized into a simple string list so the frontend can
        render it directly.
        """
        if not self.is_enabled() or not query_text:
            return self._fallback_keywords(query_text)

        prompt = (
            "Extract 3 to 5 concise keywords or short key phrases from this search query.\n"
            "Return only a comma-separated list.\n"
            "Do not add explanations.\n\n"
            "Query: {query}"
        ).format(query=query_text)

        response_text = self._create_chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": "You extract short keywords from user search queries.",
                },
                {"role": "user", "content": prompt},
            ]
        )
        keywords = [item.strip(" -") for item in response_text.split(",")]
        keywords = [item for item in keywords if item]
        return keywords[:5] or self._fallback_keywords(query_text)

    def chat(self, messages: list[dict[str, str]], current_query: str = "") -> str:
        """
        Continues a chat conversation.

        The current query is included as lightweight context so the assistant
        can stay grounded in the user's latest search topic.
        """
        if not self.is_enabled():
            raise ValueError(
                "GROQ_API_KEY is missing. Add it to your .env file before using the chatbot."
            )

        system_message = {
            "role": "system",
            "content": (
                "You are a helpful study assistant inside a browser-search learning demo. "
                "Answer clearly and briefly. If a current search query is provided, use it as context."
            ),
        }
        contextual_messages = [system_message]

        if current_query:
            contextual_messages.append(
                {
                    "role": "system",
                    "content": "Current active search query: {query}".format(
                        query=current_query
                    ),
                }
            )

        contextual_messages.extend(messages)
        return self._create_chat_completion(messages=contextual_messages)

    def _create_chat_completion(self, messages: list[dict[str, str]]) -> str:
        response = requests.post(
            self.base_url,
            headers={
                "Authorization": "Bearer {api_key}".format(api_key=self.api_key),
                "Content-Type": "application/json",
            },
            json={
                "model": self.model,
                "messages": messages,
            },
            timeout=30,
        )

        if response.status_code != 200:
            raise RuntimeError(
                "Groq request failed with status {status}: {body}".format(
                    status=response.status_code,
                    body=response.text,
                )
            )

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError("Groq response did not contain any choices.")

        message = choices[0].get("message", {})
        return message.get("content", "").strip()

    def _fallback_keywords(self, query_text: str) -> list[str]:
        words = [word.strip(" ,.!?;:") for word in query_text.split()]
        words = [word for word in words if word]
        return words[:5]
