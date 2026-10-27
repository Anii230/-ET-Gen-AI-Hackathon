"""Centralised environment configuration.

Every module should read settings from here instead of calling
``os.getenv`` directly. Values are resolved lazily so tests (and
processes that set env vars late) see the current environment.
"""

import os
from typing import List, Optional

from dotenv import load_dotenv

# Load .env once, relative to this file, regardless of the working directory.
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"
DEFAULT_GROQ_MODEL_SMALL = "openai/gpt-oss-20b"
DEFAULT_GROQ_REASONING_EFFORT = "low"

DEFAULT_CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def groq_model() -> str:
    """Model used for chat, briefings and topic synthesis."""
    return _env("GROQ_MODEL", DEFAULT_GROQ_MODEL) or DEFAULT_GROQ_MODEL


def groq_model_small() -> str:
    """Cheaper model used for short, structured tasks (story arcs)."""
    return _env("GROQ_MODEL_SMALL", DEFAULT_GROQ_MODEL_SMALL) or DEFAULT_GROQ_MODEL_SMALL


def groq_reasoning_effort() -> Optional[str]:
    """Reasoning budget for gpt-oss style models.

    Unset -> default ("low"). Set to an empty value / "none" / "off" to
    omit the parameter entirely.
    """
    raw = os.getenv("GROQ_REASONING_EFFORT")
    if raw is None:
        return DEFAULT_GROQ_REASONING_EFFORT
    value = raw.strip().lower()
    if value in ("", "none", "off", "false"):
        return None
    return value


def groq_api_key() -> str:
    """Return the Groq API key or raise a configuration error.

    The key itself is never logged or included in error messages.
    """
    key = _env("GROQ_API_KEY")
    if not key:
        raise RuntimeError("GROQ_API_KEY is not configured")
    return key


def cors_origins() -> List[str]:
    """Allowed browser origins, overridable with a comma-separated env var."""
    raw = _env("CORS_ORIGINS")
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    return list(DEFAULT_CORS_ORIGINS)
