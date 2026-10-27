"""Shared Groq client and error handling.

All AI calls in the backend go through :func:`chat_completion` so that
model selection, reasoning settings and error mapping stay consistent.

Diagnostic logging intentionally records only structured metadata
(model, HTTP status, provider error code, request id). It never logs the
API key, prompt text, article content or user messages.
"""

import logging
from dataclasses import dataclass
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


@dataclass(frozen=True)
class CompletionResult:
    """Assistant text plus the metadata needed to detect truncation.

    ``finish_reason == "length"`` means the provider stopped at the output-token
    ceiling. Callers that promise a fixed structure (briefings) must treat that
    as incomplete rather than as a finished response.
    """

    content: str
    finish_reason: Optional[str] = None
    model: str = ""
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None

    @property
    def truncated(self) -> bool:
        return self.finish_reason == "length"


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

    Kept as the small, stable API used by chat and story arcs. Briefings use
    :func:`chat_completion_result` so they can inspect ``finish_reason``.
    """
    return chat_completion_result(
        messages,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
    ).content


def chat_completion_result(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.6,
    max_tokens: int = 400,
) -> CompletionResult:
    """Run a chat completion and return text plus finish reason and usage.

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

    choice = completion.choices[0]
    finish_reason = getattr(choice, "finish_reason", None)
    content = (choice.message.content or "").strip()
    usage = getattr(completion, "usage", None)

    if not content:
        logger.warning(
            "Groq returned empty content: model=%s finish_reason=%s",
            selected_model,
            finish_reason,
        )
        raise LLMServiceError(502, MSG_EMPTY, "llm_empty_response")

    result = CompletionResult(
        content=content,
        finish_reason=finish_reason,
        model=selected_model,
        prompt_tokens=getattr(usage, "prompt_tokens", None),
        completion_tokens=getattr(usage, "completion_tokens", None),
        total_tokens=getattr(usage, "total_tokens", None),
    )
    logger.info(
        "Groq completion: model=%s finish_reason=%s prompt_tokens=%s completion_tokens=%s",
        result.model,
        result.finish_reason,
        result.prompt_tokens,
        result.completion_tokens,
    )
    return result
