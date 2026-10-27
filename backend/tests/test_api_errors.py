"""Route-level tests for AI error handling and CORS behaviour.

No network calls are made: the LLM helper is patched in each test.
"""

import sys
import unittest
from pathlib import Path
from unittest import mock

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient  # noqa: E402

import agents.briefing_router as briefing_router  # noqa: E402
import routers.chat as chat_router  # noqa: E402
from database import get_db  # noqa: E402
from llm import LLMServiceError  # noqa: E402
from main import app  # noqa: E402

ORIGIN = "http://localhost:3000"


class FakeQuery:
    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def notin_(self, *args, **kwargs):
        return self

    def all(self):
        return []

    def first(self):
        return None


class FakeDB:
    def query(self, *args, **kwargs):
        return FakeQuery()


def fake_db():
    yield FakeDB()


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides[get_db] = fake_db

    def tearDown(self):
        app.dependency_overrides.clear()

    def client(self):
        # No context manager: lifespan (and thus table creation) is not run.
        return TestClient(app)


class ChatErrorTests(ApiTestCase):
    def test_rate_limit_returns_429_with_friendly_message_and_cors(self):
        with mock.patch.object(
            chat_router,
            "chat_completion",
            side_effect=LLMServiceError(429, "The AI service is busy. Please try again in a moment.", "llm_rate_limited"),
        ):
            res = self.client().post(
                "/chat/",
                json={"user_id": "demo_user", "message": "hi"},
                headers={"Origin": ORIGIN},
            )

        self.assertEqual(res.status_code, 429)
        self.assertEqual(res.headers.get("access-control-allow-origin"), ORIGIN)
        body = res.json()
        self.assertEqual(body["code"], "llm_rate_limited")
        self.assertIn("busy", body["detail"].lower())
        for leaked in ("llama", "model_not_found", "groq", "Error code"):
            self.assertNotIn(leaked, res.text)

    def test_model_unavailable_returns_503_with_cors(self):
        with mock.patch.object(
            chat_router,
            "chat_completion",
            side_effect=LLMServiceError(503, "The AI model is temporarily unavailable.", "llm_model_unavailable"),
        ):
            res = self.client().post(
                "/chat/",
                json={"user_id": "demo_user", "message": "hi"},
                headers={"Origin": ORIGIN},
            )

        self.assertEqual(res.status_code, 503)
        self.assertEqual(res.headers.get("access-control-allow-origin"), ORIGIN)
        self.assertNotIn("model_not_found", res.text)

    def test_unexpected_error_returns_json_500_with_cors(self):
        with mock.patch.object(chat_router, "chat_completion", side_effect=RuntimeError("boom")):
            res = self.client().post(
                "/chat/",
                json={"user_id": "demo_user", "message": "hi"},
                headers={"Origin": ORIGIN},
            )

        self.assertEqual(res.status_code, 500)
        self.assertEqual(res.headers.get("access-control-allow-origin"), ORIGIN)
        self.assertEqual(res.json(), {"detail": "Internal server error."})
        self.assertNotIn("boom", res.text)


class CorsTests(ApiTestCase):
    def test_loopback_origin_preflight_is_allowed(self):
        res = self.client().options(
            "/chat/",
            headers={
                "Origin": "http://127.0.0.1:3000",
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertIn(res.status_code, (200, 204))
        self.assertEqual(
            res.headers.get("access-control-allow-origin"),
            "http://127.0.0.1:3000",
        )


class BriefingDegradedTests(ApiTestCase):
    def test_failed_synthesis_returns_200_degraded_without_raw_error(self):
        state = {
            "briefing": "AI briefing is temporarily unavailable right now.",
            "sources_used": [],
            "ranked_articles": [],
            "briefing_error": "llm_model_unavailable",
        }
        stub_pipeline = mock.Mock()
        stub_pipeline.invoke.return_value = state

        with mock.patch.object(briefing_router, "pipeline", stub_pipeline):
            res = self.client().post(
                "/briefing/",
                json={"user_id": "demo_user"},
                headers={"Origin": ORIGIN},
            )

        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["degraded"])
        self.assertIn("temporarily unavailable", res.json()["briefing"])
        for leaked in ("llama", "model_not_found", "Error code", "groq"):
            self.assertNotIn(leaked, res.text)

    def test_successful_synthesis_is_not_degraded(self):
        state = {
            "briefing": "TOP STORY: Markets rallied on policy news.",
            "sources_used": ["a1"],
            "ranked_articles": [{"id": "a1"}],
            "briefing_error": None,
        }
        stub_pipeline = mock.Mock()
        stub_pipeline.invoke.return_value = state

        with mock.patch.object(briefing_router, "pipeline", stub_pipeline):
            res = self.client().post(
                "/briefing/",
                json={"user_id": "demo_user"},
                headers={"Origin": ORIGIN},
            )

        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()["degraded"])
        self.assertIn("Markets rallied", res.json()["briefing"])


if __name__ == "__main__":
    unittest.main()
