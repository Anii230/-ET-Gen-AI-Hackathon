"""Pagination, category filtering and preference tests.

Uses an isolated in-memory SQLite database. Network ingestion is disabled, so
these tests are deterministic and never touch ``et_news.db``.
"""

import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest import mock

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from database import Base, get_db  # noqa: E402
import routers.feed as feed_router  # noqa: E402
from main import app  # noqa: E402
from models import Article, ArticleCategory, UserProfile  # noqa: E402

BASE_TIME = datetime(2026, 1, 1, 12, 0, 0)


def make_article(index, published_at=None):
    return Article(
        id=f"a{index:02d}",
        headline=f"Story number {index}",
        summary="Summary text",
        content="",
        source="Test Wire",
        category="General",
        url=f"https://example.test/{index}",
        published_at=published_at,
        read_time=2,
        sentiment_label="neutral",
        entities=[],
        enriched=True,
    )


class ApiTestBase(unittest.TestCase):
    ARTICLE_COUNT = 30

    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(
            bind=self.engine, autocommit=False, autoflush=False
        )

        db = self.Session()
        for index in range(self.ARTICLE_COUNT):
            db.add(make_article(index, BASE_TIME - timedelta(minutes=index)))
        db.flush()

        # a00..a09 technology (a04 also cybersecurity)
        for index in range(10):
            db.add(
                ArticleCategory(
                    article_id=f"a{index:02d}",
                    category="technology",
                    source="keyword",
                )
            )
        db.add(
            ArticleCategory(
                article_id="a04", category="cybersecurity", source="keyword"
            )
        )
        # a10..a14 cybersecurity only
        for index in range(10, 15):
            db.add(
                ArticleCategory(
                    article_id=f"a{index:02d}",
                    category="cybersecurity",
                    source="keyword",
                )
            )
        # a15..a19 sports only
        for index in range(15, 20):
            db.add(
                ArticleCategory(
                    article_id=f"a{index:02d}", category="sports", source="keyword"
                )
            )
        db.commit()
        db.close()

        def override_get_db():
            session = self.Session()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = override_get_db
        self.ingest_patch = mock.patch.object(
            feed_router, "_maybe_ingest", lambda db: None
        )
        self.ingest_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        self.ingest_patch.stop()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def page(self, path, **params):
        response = self.client.get(path, params=params)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def walk(self, path, limit, **params):
        articles = []
        cursor = None
        for _ in range(50):
            query = dict(params, limit=limit)
            if cursor:
                query["cursor"] = cursor
            payload = self.page(path, **query)
            articles.extend(payload["articles"])
            if not payload["has_more"]:
                self.assertIsNone(payload["next_cursor"])
                return articles
            self.assertIsNotNone(payload["next_cursor"])
            cursor = payload["next_cursor"]
        self.fail("pagination did not terminate")


class FeedTests(ApiTestBase):
    def test_general_feed_paginates_without_duplicates_or_skips(self):
        articles = self.walk("/feed/", limit=7)
        self.assertEqual(len(articles), self.ARTICLE_COUNT)
        ids = [article["id"] for article in articles]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(ids, [f"a{index:02d}" for index in range(self.ARTICLE_COUNT)])

    def test_general_feed_metadata(self):
        first = self.page("/feed/", limit=5)
        self.assertEqual(len(first["articles"]), 5)
        self.assertTrue(first["has_more"])
        self.assertIsNotNone(first["next_cursor"])

        last = self.page("/feed/", limit=30)
        self.assertFalse(last["has_more"])
        self.assertIsNone(last["next_cursor"])

    def test_malformed_cursor_is_rejected(self):
        response = self.client.get("/feed/", params={"cursor": "not-a-cursor"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("cursor", response.json()["detail"].lower())

    def test_limit_is_validated(self):
        self.assertEqual(
            self.client.get("/feed/", params={"limit": 0}).status_code, 422
        )
        self.assertEqual(
            self.client.get("/feed/", params={"limit": 51}).status_code, 422
        )

    def test_stable_ordering_with_identical_timestamps(self):
        db = self.Session()
        db.query(Article).update({Article.published_at: BASE_TIME})
        db.commit()
        db.close()

        articles = self.walk("/feed/", limit=4)
        ids = [article["id"] for article in articles]
        self.assertEqual(len(ids), self.ARTICLE_COUNT)
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(ids, sorted(ids, reverse=True))

    def test_personalised_feed_only_returns_selected_categories(self):
        articles = self.walk(
            "/feed/personalised",
            limit=4,
            user_id="u1",
            categories="technology",
        )
        self.assertEqual(len(articles), 10)
        for article in articles:
            self.assertIn("technology", article["categories"])
            self.assertNotIn("sports", article["categories"])
        self.assertTrue(all(article["is_personalised"] for article in articles))

    def test_multi_category_union_is_deduplicated(self):
        articles = self.walk(
            "/feed/personalised",
            limit=3,
            user_id="u1",
            categories="technology,cybersecurity",
        )
        ids = [article["id"] for article in articles]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(len(ids), 15)  # 10 tech + 6 cyber - 1 overlap
        self.assertIn("a04", ids)
        self.assertEqual(ids.count("a04"), 1)
        for article in articles:
            self.assertTrue(
                {"technology", "cybersecurity"} & set(article["categories"])
            )

    def test_personalised_feed_does_not_leak_other_categories(self):
        articles = self.walk(
            "/feed/personalised", limit=5, categories="sports"
        )
        self.assertEqual(
            {article["id"] for article in articles},
            {f"a{index:02d}" for index in range(15, 20)},
        )

    def test_empty_selection_is_honest_and_does_not_fall_back(self):
        payload = self.page(
            "/feed/personalised", user_id="nobody", categories=""
        )
        self.assertEqual(payload["articles"], [])
        self.assertFalse(payload["has_more"])
        self.assertIsNone(payload["next_cursor"])

    def test_unknown_category_is_rejected(self):
        response = self.client.get(
            "/feed/personalised", params={"categories": "technology,space-lasers"}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("space-lasers", response.json()["detail"])

    def test_cursor_cannot_be_reused_after_filter_change(self):
        first = self.page(
            "/feed/personalised", limit=3, categories="technology"
        )
        cursor = first["next_cursor"]
        response = self.client.get(
            "/feed/personalised",
            params={"categories": "sports", "cursor": cursor},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("filters changed", response.json()["detail"].lower())

    def test_general_feed_ignores_saved_preferences(self):
        self.client.post(
            "/users/preferences",
            json={"user_id": "u1", "categories": ["sports"]},
        )
        articles = self.walk("/feed/", limit=6)
        self.assertEqual(len(articles), self.ARTICLE_COUNT)

    def test_saved_preferences_are_used_when_categories_are_omitted(self):
        response = self.client.post(
            "/users/preferences",
            json={"user_id": "u1", "categories": ["technology"]},
        )
        self.assertEqual(response.status_code, 200, response.text)

        articles = self.walk("/feed/personalised", limit=4, user_id="u1")
        self.assertEqual(len(articles), 10)
        for article in articles:
            self.assertIn("technology", article["categories"])

    def test_categories_endpoint_lists_all_eighteen_with_counts(self):
        payload = self.page("/feed/categories")
        self.assertEqual(len(payload["categories"]), 18)
        by_id = {item["id"]: item for item in payload["categories"]}
        self.assertEqual(by_id["technology"]["article_count"], 10)
        self.assertEqual(by_id["cybersecurity"]["article_count"], 6)
        self.assertEqual(by_id["climate-environment"]["article_count"], 0)
        self.assertEqual(len({item["label"] for item in payload["categories"]}), 18)


class PreferencesApiTests(ApiTestBase):
    def test_preferences_persist_and_are_isolated_per_user(self):
        self.client.post(
            "/users/preferences",
            json={"user_id": "alice", "categories": ["technology", "sports"]},
        )
        self.client.post(
            "/users/preferences",
            json={"user_id": "bob", "topics": ["Tech"]},
        )

        alice = self.client.get("/users/alice/profile").json()
        bob = self.client.get("/users/bob/profile").json()

        self.assertEqual(alice["categories"], ["technology", "sports"])
        self.assertEqual(bob["categories"], ["technology"])

    def test_legacy_topics_are_accepted(self):
        response = self.client.post(
            "/users/preferences",
            json={"user_id": "u2", "topics": ["Markets", "AI"]},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            response.json()["categories"],
            ["markets-investing", "artificial-intelligence"],
        )

    def test_unknown_preference_is_rejected_without_writing(self):
        response = self.client.post(
            "/users/preferences",
            json={"user_id": "u3", "categories": ["technology", "telepathy"]},
        )
        self.assertEqual(response.status_code, 400)
        profile = self.client.get("/users/u3/profile").json()
        self.assertEqual(profile["categories"], [])

    def test_preferences_do_not_clobber_engagement_weights(self):
        db = self.Session()
        db.add(
            UserProfile(
                id="weighted",
                user_id="weighted",
                category_weights={"Technology": 0.9},
                entity_interests=["sports"],
            )
        )
        db.commit()
        db.close()

        self.client.post(
            "/users/preferences",
            json={"user_id": "weighted", "categories": ["technology"]},
        )

        db = self.Session()
        profile = (
            db.query(UserProfile)
            .filter(UserProfile.user_id == "weighted")
            .one()
        )
        self.assertEqual(profile.category_weights, {"Technology": 0.9})
        self.assertEqual(profile.entity_interests, ["technology"])
        db.close()

    def test_profile_ignores_unknown_stored_values(self):
        db = self.Session()
        db.add(
            UserProfile(
                id="legacy",
                user_id="legacy",
                category_weights={},
                entity_interests=["Tech", "Telepathy", "Sports"],
            )
        )
        db.commit()
        db.close()

        profile = self.client.get("/users/legacy/profile").json()
        self.assertEqual(profile["categories"], ["technology", "sports"])
        self.assertEqual(
            profile["topic_preferences"], ["Tech", "Telepathy", "Sports"]
        )


if __name__ == "__main__":
    unittest.main()
