"""Tests for model configuration and AI error handling.

Run from the backend directory:

    python -m unittest discover -s tests -v

Uses only the standard library test runner plus the app's existing
dependencies; no network calls are made and no API key is required.
"""

import os
import sys
import unittest
from pathlib import Path
from unittest import mock

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import groq  # noqa: E402

import config  # noqa: E402
import llm  # noqa: E402


class FakeStatusError(Exception):
    """Minimal stand-in for a groq.APIStatusError."""

    def __init__(self, status_code, code=None):
        super().__init__("provider error")
        self.status_code = status_code
        self.body = {"error": {"code": code}} if code else None


class EnvTestCase(unittest.TestCase):
    ENV_VARS = (
        "GROQ_MODEL",
        "GROQ_MODEL_SMALL",
        "GROQ_REASONING_EFFORT",
        "GROQ_API_KEY",
        "CORS_ORIGINS",
    )

    def setUp(self):
        self._saved = {name: os.environ.get(name) for name in self.ENV_VARS}
        for name in self.ENV_VARS:
            os.environ.pop(name, None)

    def tearDown(self):
        for name, value in self._saved.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value


class ConfigTests(EnvTestCase):
    def test_verified_default_models(self):
        self.assertEqual(config.groq_model(), "openai/gpt-oss-120b")
        self.assertEqual(config.groq_model_small(), "openai/gpt-oss-20b")

    def test_models_are_overridable(self):
        os.environ["GROQ_MODEL"] = "qwen/qwen3.8-27b"
        os.environ["GROQ_MODEL_SMALL"] = "openai/gpt-oss-20b"
        self.assertEqual(config.groq_model(), "qwen/qwen3.8-27b")
        self.assertEqual(config.groq_model_small(), "openai/gpt-oss-20b")

    def test_blank_override_falls_back_to_default(self):
        os.environ["GROQ_MODEL"] = "   "
        self.assertEqual(config.groq_model(), config.DEFAULT_GROQ_MODEL)

    def test_reasoning_effort_defaults_and_can_be_disabled(self):
        self.assertEqual(config.groq_reasoning_effort(), "low")
        os.environ["GROQ_REASONING_EFFORT"] = ""
        self.assertIsNone(config.groq_reasoning_effort())

    def test_cors_defaults_cover_localhost_and_loopback(self):
        self.assertIn("http://localhost:3000", config.cors_origins())
        self.assertIn("http://127.0.0.1:3000", config.cors_origins())

    def test_cors_override_is_comma_separated(self):
        os.environ["CORS_ORIGINS"] = "http://a.test, http://b.test"
        self.assertEqual(config.cors_origins(), ["http://a.test", "http://b.test"])

    def test_missing_api_key_raises_without_echoing_a_secret(self):
        with self.assertRaises(RuntimeError) as ctx:
            config.groq_api_key()
        self.assertIn("GROQ_API_KEY", str(ctx.exception))
        self.assertNotIn("gsk_", str(ctx.exception))


class ClassifyErrorTests(unittest.TestCase):
    def assert_maps(self, exc, status, code):
        mapped = llm.classify_error(exc)
        self.assertIsInstance(mapped, llm.LLMServiceError)
        self.assertEqual(mapped.status_code, status)
        self.assertEqual(mapped.code, code)
        return mapped

    def test_model_not_found_uses_404_code_even_with_http_404(self):
        self.assert_maps(FakeStatusError(404, "model_not_found"), 503, "llm_model_unavailable")

    def test_model_not_found_detected_from_provider_code(self):
        self.assert_maps(FakeStatusError(400, "model_not_found"), 503, "llm_model_unavailable")

    def test_auth_errors(self):
        self.assert_maps(FakeStatusError(401), 503, "llm_auth")
        self.assert_maps(FakeStatusError(403), 503, "llm_forbidden")

    def test_rate_limit_is_passed_through_as_429(self):
        self.assert_maps(FakeStatusError(429), 429, "llm_rate_limited")

    def test_upstream_and_bad_request(self):
        self.assert_maps(FakeStatusError(500), 502, "llm_upstream")
        self.assert_maps(FakeStatusError(400), 502, "llm_bad_request")

    def test_unknown_error_defaults_to_502(self):
        self.assert_maps(FakeStatusError(None), 502, "llm_error")
        self.assert_maps(FakeStatusError(418), 502, "llm_error")

    def test_connection_and_timeout(self):
        self.assert_maps(groq.APITimeoutError(request=mock.Mock()), 504, "llm_timeout")
        self.assert_maps(groq.APIConnectionError(request=mock.Mock()), 502, "llm_unreachable")

    def test_user_messages_never_contain_provider_details(self):
        mapped = llm.classify_error(FakeStatusError(404, "model_not_found"))
        text = mapped.user_message.lower()
        for leaked in ("llama", "groq", "model_not_found", "api key", "gsk_", "error code"):
            self.assertNotIn(leaked, text)


class ChatCompletionTests(EnvTestCase):
    def test_client_raises_typed_error_when_key_missing(self):
        llm.reset_client()
        with self.assertRaises(llm.LLMServiceError) as ctx:
            llm.chat_completion([{"role": "user", "content": "hi"}])
        self.assertEqual(ctx.exception.status_code, 503)
        self.assertEqual(ctx.exception.code, "llm_not_configured")
        llm.reset_client()

    def test_empty_content_becomes_typed_error(self):
        os.environ["GROQ_API_KEY"] = "test-key-not-used"
        llm.reset_client()
        fake_client = mock.Mock()
        fake_client.chat.completions.create.return_value = mock.Mock(
            choices=[mock.Mock(message=mock.Mock(content="   "), finish_reason="length")]
        )
        with mock.patch.object(llm, "get_client", return_value=fake_client):
            with self.assertRaises(llm.LLMServiceError) as ctx:
                llm.chat_completion([{"role": "user", "content": "hi"}])
        self.assertEqual(ctx.exception.code, "llm_empty_response")
        llm.reset_client()

    def test_reasoning_effort_only_sent_to_gpt_oss_models(self):
        os.environ["GROQ_API_KEY"] = "test-key-not-used"
        llm.reset_client()
        fake_client = mock.Mock()
        fake_client.chat.completions.create.return_value = mock.Mock(
            choices=[mock.Mock(message=mock.Mock(content="OK"), finish_reason="stop")]
        )
        with mock.patch.object(llm, "get_client", return_value=fake_client):
            llm.chat_completion([{"role": "user", "content": "hi"}], model="openai/gpt-oss-120b")
            kwargs = fake_client.chat.completions.create.call_args.kwargs
            self.assertEqual(kwargs["reasoning_effort"], "low")

            llm.chat_completion([{"role": "user", "content": "hi"}], model="qwen/qwen3.8-27b")
            kwargs = fake_client.chat.completions.create.call_args.kwargs
            self.assertNotIn("reasoning_effort", kwargs)
        llm.reset_client()

    def test_result_surfaces_finish_reason_and_usage(self):
        os.environ["GROQ_API_KEY"] = "test-key-not-used"
        llm.reset_client()
        fake_client = mock.Mock()
        fake_client.chat.completions.create.return_value = mock.Mock(
            choices=[
                mock.Mock(
                    message=mock.Mock(content="A complete answer."),
                    finish_reason="stop",
                )
            ],
            usage=mock.Mock(prompt_tokens=120, completion_tokens=45, total_tokens=165),
        )
        with mock.patch.object(llm, "get_client", return_value=fake_client):
            result = llm.chat_completion_result(
                [{"role": "user", "content": "hi"}]
            )
        self.assertEqual(result.content, "A complete answer.")
        self.assertEqual(result.finish_reason, "stop")
        self.assertFalse(result.truncated)
        self.assertEqual(result.prompt_tokens, 120)
        self.assertEqual(result.completion_tokens, 45)
        self.assertEqual(result.total_tokens, 165)
        llm.reset_client()

    def test_length_finish_reason_is_exposed_for_callers(self):
        os.environ["GROQ_API_KEY"] = "test-key-not-used"
        llm.reset_client()
        fake_client = mock.Mock()
        fake_client.chat.completions.create.return_value = mock.Mock(
            choices=[
                mock.Mock(
                    message=mock.Mock(content="Cut off mid"),
                    finish_reason="length",
                )
            ],
            usage=None,
        )
        with mock.patch.object(llm, "get_client", return_value=fake_client):
            result = llm.chat_completion_result(
                [{"role": "user", "content": "hi"}]
            )
        self.assertTrue(result.truncated)
        self.assertIsNone(result.prompt_tokens)
        llm.reset_client()


class NoDeprecatedModelIdsTests(unittest.TestCase):
    def test_backend_source_has_no_retired_llama_ids(self):
        for path in BACKEND_DIR.rglob("*.py"):
            if "tests" in path.parts or ".venv" in path.parts:
                continue
            text = path.read_text(encoding="utf-8")
            with self.subTest(path=str(path)):
                self.assertNotIn("llama-3.3-70b-versatile", text)
                self.assertNotIn("llama-3.1-8b-instant", text)


if __name__ == "__main__":
    unittest.main()
