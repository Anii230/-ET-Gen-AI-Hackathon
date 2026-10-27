"""Shared Groq client and error handling.

All AI calls in the backend go through :func:`chat_completion` so that
model selection, reasoning settings and error mapping stay consistent.

Diagnostic logging intentionally records only structured metadata
(model, HTTP status, provider error code, request id). It never logs the
API key, prompt text, article content or user messages.
"""

import logging
from typing import Any, Dict, List, Optional

import groq
from groq import Groq

from config import groq_api_key, groq_model, groq_reasoning_effort

logger = logging.getLogger("et_news.llm")

# Message shown to users when the provider cannot serve a request.
MSG_NOT_CONFIGURED = "The AI service is not configured correctly."
MSG_AUTH = "The AI service rejected its credentials. Please contact support."
MSG_MODEL_UNAVAILABLE = "The AI model is temporarily unavailable."
MSG_RATE_LIMITED = "The AI service is busy. Please try again in a moment."
MSG_UPSTREAM = "The AI service returned an error. Please try again."
MSG_TIMEOUT = "The AI service took too long to respond. Please try again."
MSG_UNREACHABLE = "Could not reach the AI service. Please try again."
MSG_BAD_REQUEST = "The AI service rejected the request."
MSG_EMPTY = "The AI service returned an empty response. Please try again."


class LLMServiceError(Exception):
    """An AI failure translated into an HTTP-safe, user-facing error."""

    def __init__(self, status_code: int, user_message: str, code: str = "llm_error"):
        super().__init__(user_message)
        self.status_code = status_code
        self.user_message = user_message
        self.code = code


_client_instance: Optional[Groq] = None


def reset_client() -> None:
    """Drop the cached client (used by tests and after config changes)."""
    global _client_instance
    _client_instance = None


def get_client() -> Groq:
    global _client_instance
    if _client_instance is None:
        try:
            _client_instance = Groq(api_key=groq_api_key())
        except RuntimeError as exc:
            logger.error("Groq client unavailable: GROQ_API_KEY is not set")
            raise LLMServiceError(503, MSG_NOT_CONFIGURED, "llm_not_configured") from exc
    return _client_instance


def _error_details(exc: BaseException) -> Dict[str, Any]:
    status = getattr(exc, "status_code", None)
    body = getattr(exc, "body", None)
    code = None
    if isinstance(body, dict):
        error = body.get("error")
        if isinstance(error, dict):
            code = error.get("code")
    request_id = getattr(exc, "request_id", None)
    return {"status": status, "code": code, "request_id": request_id}


def classify_error(exc: BaseException) -> LLMServiceError:
    """Map a provider exception to an :class:`LLMServiceError`.

    Kept pure so it can be unit tested without network access.
    """
    details = _error_details(exc)
    status = details["status"]
    provider_code = details["code"]

    if isinstance(exc, groq.APITimeoutError):
        return LLMServiceError(504, MSG_TIMEOUT, "llm_timeout")

    if isinstance(exc, groq.APIConnectionError):
        return LLMServiceError(502, MSG_UNREACHABLE, "llm_unreachable")

    if status == 401:
        return LLMServiceError(503, MSG_AUTH, "llm_auth")

    if status == 403:
        return LLMServiceError(503, MSG_AUTH, "llm_forbidden")

    if status == 404 or provider_code == "model_not_found":
        return LLMServiceError(503, MSG_MODEL_UNAVAILABLE, "llm_model_unavailable")

    if status == 429:
        return LLMServiceError(429, MSG_RATE_LIMITED, "llm_rate_limited")

    if status is not None and status >= 500:
        return LLMServiceError(502, MSG_UPSTREAM, "llm_upstream")

    if status == 400:
        return LLMServiceError(502, MSG_BAD_REQUEST, "llm_bad_request")

    return LLMServiceError(502, MSG_UPSTREAM, "llm_error")


def chat_completion(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.6,
    max_tokens: int = 400,
) -> str:
    """Run a chat completion and return the assistant's text.

    Raises :class:`LLMServiceError` for any provider or configuration
    failure; raw provider errors never leave this function.
    """
    selected_model = model or groq_model()

    kwargs: Dict[str, Any] = {
        "model": selected_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    effort = groq_reasoning_effort()
    if effort and selected_model.startswith("openai/gpt-oss"):
        kwargs["reasoning_effort"] = effort

    try:
        completion = get_client().chat.completions.create(**kwargs)
    except LLMServiceError:
        raise
    except Exception as exc:  # noqa: BLE001 - translated into a typed error below
        mapped = classify_error(exc)
        details = _error_details(exc)
        logger.warning(
            "Groq request failed: model=%s status=%s provider_code=%s request_id=%s mapped=%s",
            selected_model,
            details["status"],
            details["code"],
            details["request_id"],
            mapped.code,
        )
        raise mapped from exc

    content = (completion.choices[0].message.content or "").strip()
    if not content:
        logger.warning(
            "Groq returned empty content: model=%s finish_reason=%s",
            selected_model,
            completion.choices[0].finish_reason,
        )
        raise LLMServiceError(502, MSG_EMPTY, "llm_empty_response")

    return content
