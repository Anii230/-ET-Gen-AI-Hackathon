"""Briefing truncation and bounded-recovery tests.

No network calls: the LLM helper is replaced with deterministic results.
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
import agents.graph as graph  # noqa: E402
import agents.synthesis_agent as synthesis_agent  # noqa: E402
from database import get_db  # noqa: E402
from llm import CompletionResult, LLMServiceError  # noqa: E402
from main import app  # noqa: E402


def result(content, finish_reason, completion_tokens=100):
    return CompletionResult(
        content=content,
        finish_reason=finish_reason,
        model="openai/gpt-oss-120b",
        prompt_tokens=500,
        completion_tokens=completion_tokens,
        total_tokens=500 + completion_tokens,
    )


ARTICLES = [
    {
        "id": "a1",
        "headline": "Markets rally on policy news",
        "source": "ET",
        "summary": "Indices rose after the announcement.",
        "content": (
            "Longer reporting extract for context: the benchmark index rose "
            "1.2% as banks and energy stocks led gains, while the rupee held "
            "steady against the dollar."
        ),
        "category": "Markets",
        "sentiment_label": "positive",
    }
]


class SynthesisTruncationTests(unittest.TestCase):
    def run_with(self, *results):
        fake = mock.Mock(side_effect=list(results))
        with mock.patch.object(synthesis_agent, "chat_completion_result", fake):
            outcome = synthesis_agent.run_synthesis(ARTICLES)
        return outcome, fake

    def test_complete_response_is_not_retried(self):
        outcome, fake = self.run_with(result("### Top Story\nDone.", "stop"))
        self.assertTrue(outcome.complete)
        self.assertFalse(outcome.truncated)
        self.assertFalse(outcome.recovered)
        self.assertEqual(fake.call_count, 1)
        self.assertEqual(outcome.briefing, "### Top Story\nDone.")

    def test_length_truncation_regenerates_once_and_recovers(self):
        outcome, fake = self.run_with(
            result("### Top Story\nCut off mid", "length"),
            result("### Top Story\nComplete short draft.", "stop"),
        )
        self.assertTrue(outcome.complete)
        self.assertFalse(outcome.truncated)
        self.assertTrue(outcome.recovered)
        self.assertEqual(fake.call_count, 2)
        self.assertEqual(outcome.briefing, "### Top Story\nComplete short draft.")

        first_budget = fake.call_args_list[0].kwargs["max_tokens"]
        second_budget = fake.call_args_list[1].kwargs["max_tokens"]
        self.assertEqual(first_budget, synthesis_agent.ARTICLE_BUDGET)
        self.assertEqual(second_budget, synthesis_agent.ARTICLE_RETRY_BUDGET)
        self.assertLess(second_budget, first_budget)

    def test_second_truncation_is_reported_not_hidden(self):
        outcome, fake = self.run_with(
            result("### Top Story\nFirst partial", "length"),
            result("### Top Story\nSecond still partial", "length"),
        )
        self.assertFalse(outcome.complete)
        self.assertTrue(outcome.truncated)
        self.assertFalse(outcome.recovered)
        self.assertEqual(fake.call_count, 2)
        self.assertEqual(outcome.briefing, "### Top Story\nSecond still partial")

    def test_retry_provider_error_keeps_first_partial_and_marks_incomplete(self):
        fake = mock.Mock(
            side_effect=[
                result("### Top Story\nFirst partial", "length"),
                LLMServiceError(502, "The AI service returned an error.", "llm_upstream"),
            ]
        )
        with mock.patch.object(synthesis_agent, "chat_completion_result", fake):
            outcome = synthesis_agent.run_synthesis(ARTICLES)
        self.assertEqual(fake.call_count, 2)
        self.assertFalse(outcome.complete)
        self.assertTrue(outcome.truncated)
        self.assertEqual(outcome.briefing, "### Top Story\nFirst partial")

    def test_empty_article_list_is_not_treated_as_truncated(self):
        outcome = synthesis_agent.run_synthesis([])
        self.assertTrue(outcome.complete)
        self.assertEqual(outcome.sources, [])

    def test_prompt_includes_article_extract_for_context(self):
        fake = mock.Mock(return_value=result("Done", "stop"))
        with mock.patch.object(synthesis_agent, "chat_completion_result", fake):
            synthesis_agent.run_synthesis(ARTICLES)
        user_prompt = fake.call_args.kwargs["messages"][1]["content"]
        self.assertIn("Extract: Longer reporting extract", user_prompt)
        self.assertIn("### Top Story", user_prompt)

    def test_duplicate_summary_and_content_are_not_sent_twice(self):
        duplicate = [
            {
                **ARTICLES[0],
                "summary": "Same text in both fields.",
                "content": "Same text in both fields.",
            }
        ]
        fake = mock.Mock(return_value=result("Done", "stop"))
        with mock.patch.object(synthesis_agent, "chat_completion_result", fake):
            synthesis_agent.run_synthesis(duplicate)
        user_prompt = fake.call_args.kwargs["messages"][1]["content"]
        self.assertNotIn("Extract:", user_prompt)
        self.assertEqual(user_prompt.count("Same text in both fields."), 1)

    def test_requested_article_leads_prompt_even_after_ranking(self):
        other = {
            **ARTICLES[0],
            "id": "a2",
            "headline": "Other story",
            "summary": "Other summary text.",
            "content": "",
        }
        fake = mock.Mock(return_value=result("Done", "stop"))
        with mock.patch.object(synthesis_agent, "chat_completion_result", fake):
            outcome = synthesis_agent.run_synthesis(
                [other, ARTICLES[0]], focus_article_id="a1"
            )
        user_prompt = fake.call_args.kwargs["messages"][1]["content"]
        self.assertLess(
            user_prompt.index("Headline: Markets rally"),
            user_prompt.index("Headline: Other story"),
        )
        self.assertIn("focus story is", user_prompt.lower())
        self.assertEqual(outcome.sources[0], "a1")


class GraphFlagTests(unittest.TestCase):
    def base_state(self):
        return {
            "articles": ARTICLES,
            "user_profile": {},
            "query": "",
            "enriched_articles": ARTICLES,
            "ranked_articles": ARTICLES,
            "briefing": None,
            "sources_used": [],
            "error": None,
            "briefing_error": None,
        }

    def test_incomplete_outcome_sets_complete_false(self):
        outcome = synthesis_agent.SynthesisOutcome(
            briefing="Partial briefing",
            sources=["a1"],
            complete=False,
            truncated=True,
            finish_reason="length",
        )
        with mock.patch.object(graph, "run_synthesis", return_value=outcome):
            state = graph.synthesis_node(self.base_state())
        self.assertFalse(state["briefing_complete"])
        self.assertTrue(state["briefing_truncated"])
        self.assertIsNone(state["briefing_error"])
        self.assertEqual(state["briefing"], "Partial briefing")

    def test_provider_error_keeps_degraded_contract(self):
        error = LLMServiceError(503, "The AI model is temporarily unavailable.", "llm_model_unavailable")
        with mock.patch.object(graph, "run_synthesis", side_effect=error):
            state = graph.synthesis_node(self.base_state())
        self.assertFalse(state["briefing_complete"])
        self.assertFalse(state["briefing_truncated"])
        self.assertEqual(state["briefing_error"], "llm_model_unavailable")
        self.assertIn("temporarily unavailable", state["briefing"])


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


class BriefingResponseFlagTests(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides[get_db] = fake_db

    def tearDown(self):
        app.dependency_overrides.clear()

    def post_with_state(self, state):
        stub = mock.Mock()
        stub.invoke.return_value = state
        with mock.patch.object(briefing_router, "pipeline", stub):
            return TestClient(app).post(
                "/briefing/",
                json={"user_id": "demo_user"},
            )

    def test_incomplete_briefing_exposes_notice_and_flags(self):
        res = self.post_with_state(
            {
                "briefing": "### Top Story\nPartial",
                "sources_used": ["a1"],
                "ranked_articles": [{"id": "a1"}],
                "briefing_error": None,
                "briefing_complete": False,
                "briefing_truncated": True,
            }
        )
        body = res.json()
        self.assertEqual(res.status_code, 200)
        self.assertFalse(body["degraded"])
        self.assertFalse(body["complete"])
        self.assertTrue(body["truncated"])
        self.assertIn("stopped before", body["notice"])

    def test_complete_briefing_has_no_notice(self):
        res = self.post_with_state(
            {
                "briefing": "### Top Story\nComplete",
                "sources_used": ["a1"],
                "ranked_articles": [{"id": "a1"}],
                "briefing_error": None,
                "briefing_complete": True,
                "briefing_truncated": False,
            }
        )
        body = res.json()
        self.assertTrue(body["complete"])
        self.assertFalse(body["truncated"])
        self.assertIsNone(body["notice"])


if __name__ == "__main__":
    unittest.main()
