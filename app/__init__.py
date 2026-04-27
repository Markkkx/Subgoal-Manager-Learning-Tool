import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

from app.config import Config
from app.logging_store.base import BaseEventLogger
from app.logging_store.elasticsearch_stub import ElasticsearchEventLogger
from app.logging_store.local_json import LocalJsonEventLogger
from app.services.chat_service import ChatService
from app.services.search_service import SearchService


def create_app() -> Flask:
    """Application factory for the local research demo."""
    env_path = Path(".env")
    load_dotenv(env_path if env_path.exists() else None)

    app = Flask(__name__)
    app.config.from_object(Config)

    event_logger = build_event_logger(app.config)
    search_service = SearchService(
        api_key=app.config["SERPAPI_KEY"],
        engine=app.config["SERPAPI_ENGINE"],
    )
    chat_service = ChatService(
        api_key=app.config["GROQ_API_KEY"],
        model=app.config["GROQ_MODEL"],
    )
    firebase_config = {
        "apiKey": app.config["FIREBASE_API_KEY"],
        "authDomain": app.config["FIREBASE_AUTH_DOMAIN"],
        "projectId": app.config["FIREBASE_PROJECT_ID"],
        "storageBucket": app.config["FIREBASE_STORAGE_BUCKET"],
        "messagingSenderId": app.config["FIREBASE_MESSAGING_SENDER_ID"],
        "appId": app.config["FIREBASE_APP_ID"],
    }

    @app.get("/")
    def index():
        return render_template("index.html", firebase_config=firebase_config)

    @app.post("/api/search")
    def search():
        payload = request.get_json(silent=True) or {}
        query_text = (payload.get("query_text") or "").strip()
        user_id = (payload.get("user_id") or "demo-user").strip()
        session_id = (payload.get("session_id") or "").strip()

        if not query_text:
            return jsonify({"error": "query_text is required"}), 400

        if not session_id:
            return jsonify({"error": "session_id is required"}), 400

        search_event = {
            "user_id": user_id,
            "session_id": session_id,
            "search_mode": "browser",
            "query_text": query_text,
        }
        event_logger.log_search(search_event)

        try:
            results = search_service.search(query_text)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 500
        except RuntimeError as exc:
            return jsonify({"error": str(exc)}), 502

        keywords = []
        if chat_service.is_enabled():
            try:
                keywords = chat_service.extract_keywords(query_text)
            except RuntimeError:
                keywords = []
        else:
            keywords = chat_service.extract_keywords(query_text)

        return jsonify(
            {
                "query_text": query_text,
                "results": results,
                "keywords": keywords,
            }
        )

    @app.post("/api/tool-switch")
    def tool_switch():
        payload = request.get_json(silent=True) or {}
        required_fields = ["session_id", "previous_tool", "next_tool", "switched_at"]
        missing_fields = [field for field in required_fields if not payload.get(field)]
        if missing_fields:
            return (
                jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}),
                400,
            )

        event_logger.log_tool_switch(
            {
                "user_id": (payload.get("user_id") or "demo-user").strip(),
                "session_id": payload["session_id"],
                "previous_tool": payload["previous_tool"],
                "next_tool": payload["next_tool"],
                "switched_at": payload["switched_at"],
            }
        )
        return jsonify({"status": "ok"})

    @app.post("/api/click")
    def click():
        payload = request.get_json(silent=True) or {}
        required_fields = [
            "user_id",
            "session_id",
            "query_text",
            "clicked_url",
            "clicked_rank",
        ]
        missing_fields = [field for field in required_fields if not payload.get(field)]
        if missing_fields:
            return (
                jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}),
                400,
            )

        click_event = {
            "user_id": payload["user_id"],
            "session_id": payload["session_id"],
            "search_mode": "browser",
            "query_text": payload["query_text"],
            "clicked_url": payload["clicked_url"],
            "clicked_rank": payload["clicked_rank"],
        }
        event_logger.log_click(click_event)
        return jsonify({"status": "ok"})

    @app.post("/api/return")
    def log_return():
        payload = request.get_json(silent=True) or {}
        required_fields = [
            "user_id",
            "session_id",
            "query_text",
            "clicked_url",
            "clicked_rank",
            "left_main_page_at",
            "returned_to_main_page_at",
            "time_away_ms",
        ]
        missing_fields = [
            field
            for field in required_fields
            if payload.get(field) in (None, "")
        ]
        if missing_fields:
            return (
                jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}),
                400,
            )

        return_event = {
            "user_id": payload["user_id"],
            "session_id": payload["session_id"],
            "search_mode": "browser",
            "query_text": payload["query_text"],
            "clicked_url": payload["clicked_url"],
            "clicked_rank": payload["clicked_rank"],
            "left_main_page_at": payload["left_main_page_at"],
            "returned_to_main_page_at": payload["returned_to_main_page_at"],
            "time_away_ms": payload["time_away_ms"],
        }
        event_logger.log_return(return_event)
        return jsonify({"status": "ok"})

    @app.get("/api/logs")
    def logs():
        """Debug endpoint so the prototype is easy to inspect locally."""
        return jsonify(event_logger.get_all_events())

    @app.post("/api/evaluation")
    def evaluation():
        payload = request.get_json(silent=True) or {}
        required_fields = ["user_id", "session_id", "week", "session", "tool", "evaluation_event_type"]
        missing_fields = [
            field
            for field in required_fields
            if payload.get(field) in (None, "")
        ]
        if missing_fields:
            return (
                jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}),
                400,
            )

        if payload.get("rating") in (None, "") and payload.get("reason") in (None, ""):
            return jsonify({"error": "rating or reason is required"}), 400

        evaluation_event = {
            "user_id": payload["user_id"],
            "session_id": payload["session_id"],
            "week": payload["week"],
            "session": payload["session"],
            "tool": payload["tool"],
            "evaluation_event_type": payload["evaluation_event_type"],
            "rating": payload.get("rating"),
            "reason": payload.get("reason"),
            "evaluation_timestamp": payload.get("evaluation_timestamp"),
            "query_text": payload.get("query_text", ""),
            "clicked_url": payload.get("clicked_url", ""),
            "clicked_rank": payload.get("clicked_rank"),
            "chat_question": payload.get("chat_question", ""),
            "chat_answer": payload.get("chat_answer", ""),
            "previous_tool": payload.get("previous_tool", ""),
            "next_tool": payload.get("next_tool", ""),
            "returned_at": payload.get("returned_at", ""),
            "time_away_ms": payload.get("time_away_ms"),
            "result_count": payload.get("result_count"),
        }
        event_logger.log_evaluation(evaluation_event)
        return jsonify({"status": "ok"})

    @app.post("/api/chat")
    def chat():
        payload = request.get_json(silent=True) or {}
        messages = payload.get("messages") or []
        current_query = (payload.get("current_query") or "").strip()
        user_id = (payload.get("user_id") or "demo-user").strip()
        session_id = (payload.get("session_id") or "").strip()

        if not messages:
            return jsonify({"error": "messages is required"}), 400

        last_user_message = ""
        for message in reversed(messages):
            if message.get("role") == "user":
                last_user_message = (message.get("content") or "").strip()
                break

        if last_user_message and session_id:
            event_logger.log_chat(
                {
                    "user_id": user_id,
                    "session_id": session_id,
                    "search_mode": "browser",
                    "query_text": current_query,
                    "chat_question": last_user_message,
                }
            )

        try:
            reply = chat_service.chat(messages=messages, current_query=current_query)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 500
        except RuntimeError as exc:
            return jsonify({"error": str(exc)}), 502

        return jsonify({"reply": reply})

    return app


def build_event_logger(config: dict) -> BaseEventLogger:
    """
    Returns the active event logger.

    This is the seam where an Elasticsearch-backed implementation can be
    swapped in later without changing the route handlers.
    """
    backend = (config.get("LOG_BACKEND") or "json").lower()
    if backend == "elasticsearch":
        try:
            from elasticsearch import Elasticsearch
        except ImportError:
            raise RuntimeError(
                "LOG_BACKEND is set to elasticsearch, but the elasticsearch package is not installed."
            )

        client_kwargs = {}
        username = config.get("ELASTICSEARCH_USERNAME")
        password = config.get("ELASTICSEARCH_PASSWORD")
        if username and password:
            client_kwargs["basic_auth"] = (username, password)

        client = Elasticsearch(config["ELASTICSEARCH_URL"], **client_kwargs)
        return ElasticsearchEventLogger(
            client=client,
            index_name=config["ELASTICSEARCH_INDEX"],
        )

    storage_path = config["LOG_STORAGE_PATH"]
    os.makedirs(os.path.dirname(storage_path), exist_ok=True)
    return LocalJsonEventLogger(storage_path)
