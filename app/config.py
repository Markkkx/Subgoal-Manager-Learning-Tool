import os


class Config:
    """Small config object so settings stay in one place."""

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")
    SERPAPI_ENGINE = os.getenv("SERPAPI_ENGINE", "google")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY", "")
    FIREBASE_AUTH_DOMAIN = os.getenv("FIREBASE_AUTH_DOMAIN", "")
    FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "")
    FIREBASE_STORAGE_BUCKET = os.getenv("FIREBASE_STORAGE_BUCKET", "")
    FIREBASE_MESSAGING_SENDER_ID = os.getenv("FIREBASE_MESSAGING_SENDER_ID", "")
    FIREBASE_APP_ID = os.getenv("FIREBASE_APP_ID", "")
    LOG_BACKEND = os.getenv("LOG_BACKEND", "json")
    LOG_STORAGE_PATH = os.getenv("LOG_STORAGE_PATH", "data/events.json")
    ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
    ELASTICSEARCH_INDEX = os.getenv("ELASTICSEARCH_INDEX", "behavior-events")
    ELASTICSEARCH_USERNAME = os.getenv("ELASTICSEARCH_USERNAME", "")
    ELASTICSEARCH_PASSWORD = os.getenv("ELASTICSEARCH_PASSWORD", "")
