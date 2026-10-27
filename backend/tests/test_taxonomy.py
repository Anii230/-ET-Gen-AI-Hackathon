"""Tests for the canonical taxonomy and category persistence.

Run from the backend directory:

    python -m unittest discover -s tests -v

The classification tests are pure; the persistence tests use an in-memory
SQLite database and never touch ``et_news.db``.
"""

import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base  # noqa: E402
from models import Article, ArticleCategory  # noqa: E402
import categorization  # noqa: E402
from taxonomy import (  # noqa: E402
    CATEGORIES,
    SOURCE_MANUAL,
    classify,
    legacy_category,
    normalize_ids,
    primary_category_id,
)


class TaxonomyShapeTests(unittest.TestCase):
    def test_eighteen_unique_categories(self):
        self.assertEqual(len(CATEGORIES), 18)
        ids = [category.id for category in CATEGORIES]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(all(ids))

    def test_legacy_labels_map_explicitly(self):
        expected = {
            "Tech": "technology",
            "Technology": "technology",
            "Markets": "markets-investing",
            "Economy": "business-economy",
            "Business": "business-economy",
            "Startups": "startups-vc",
            "Policy": "politics-government",
            "Science": "science-research",
            "Entertainment": "entertainment-culture",
            "Sports": "sports",
            "AI": "artificial-intelligence",
        }
        for legacy, canonical in expected.items():
            with self.subTest(legacy=legacy):
                self.assertEqual(legacy_category(legacy), canonical)

    def test_unknown_legacy_label_maps_to_nothing(self):
        self.assertIsNone(legacy_category("General"))
        self.assertIsNone(legacy_category(None))


class ClassificationTests(unittest.TestCase):
    def ids(self, headline, summary="", legacy=None):
        return [cid for cid, _source in classify(headline, summary, legacy)]

    def test_legacy_category_is_always_kept(self):
        self.assertEqual(
            self.ids("Something entirely unrelated", legacy="Markets"),
            ["markets-investing"],
        )

    def test_multi_category_article_is_allowed(self):
        found = self.ids(
            "Tata Motors, Amazon partner to deploy 3,000 electric trucks",
            legacy="Technology",
        )
        self.assertIn("automotive-mobility", found)
        self.assertIn("technology", found)

    def test_ai_startup_matches_ai_and_startups(self):
        found = self.ids(
            "Artificial intelligence startup raises $20 million in seed round"
        )
        self.assertIn("artificial-intelligence", found)
        self.assertIn("startups-vc", found)

    def test_grand_theft_auto_is_gaming_not_automotive(self):
        found = self.ids("Grand Theft Auto VI launch: what we know")
        self.assertIn("gaming", found)
        self.assertNotIn("automotive-mobility", found)

    def test_generic_business_words_do_not_create_startups(self):
        found = self.ids("Coca-Cola raises profit forecast as drinks hold strong")
        self.assertNotIn("startups-vc", found)

    def test_generic_season_does_not_create_entertainment(self):
        found = self.ids(
            "Why this festive season is getting more expensive for sellers"
        )
        self.assertNotIn("entertainment-culture", found)

    def test_generic_century_does_not_create_sports(self):
        # Regression from the real corpus: "end of this century" in a climate
        # story was tagging Kigali coverage as Sports.
        found = self.ids(
            "Kigali Amendment at 10: What it means for India's cooling needs",
            "Full implementation could prevent up to 0.5C of global warming by "
            "the end of this century.",
        )
        self.assertIn("climate-environment", found)
        self.assertNotIn("sports", found)

    def test_live_streaming_does_not_create_entertainment(self):
        found = self.ids(
            "India vs Bangladesh Live Streaming: When and where to watch"
        )
        self.assertNotIn("entertainment-culture", found)

    def test_bond_funding_does_not_create_startups(self):
        found = self.ids(
            "Global bond issuance set to grow at slowest pace in five years",
            "Issuers are reassessing funding costs as yields rise.",
        )
        self.assertNotIn("startups-vc", found)

    def test_cyber_article(self):
        found = self.ids("Ransomware attack exposes customer data at payments firm")
        self.assertIn("cybersecurity", found)

    def test_indian_policy_article(self):
        found = self.ids("Parliament passes new data protection bill")
        self.assertIn("politics-government", found)
        self.assertIn("technology", found)

    def test_results_are_in_canonical_order(self):
        found = self.ids(
            "India and China discuss climate and technology policy",
            legacy="Economy",
        )
        order = [category.id for category in CATEGORIES]
        self.assertEqual(found, sorted(found, key=order.index))

    def test_primary_prefers_legacy_category(self):
        headline = "Big Tech earnings a test of the AI boom"
        classifications = classify(headline, "", "Markets")
        self.assertEqual(
            primary_category_id(classifications, "Markets"),
            "markets-investing",
        )

    def test_primary_falls_back_to_keyword(self):
        classifications = classify("Ransomware attack hits hospital", "")
        self.assertEqual(primary_category_id(classifications), "cybersecurity")


class EnricherBoundaryTests(unittest.TestCase):
    def test_app_inside_applicant_does_not_select_tech(self):
        from enricher import detect_category

        text = (
            "Under the Insolvency and Bankruptcy Code, neither the CoC nor the "
            "resolution applicant can withdraw the approved resolution."
        )
        self.assertEqual(detect_category(text, default="Business"), "Business")

    def test_real_app_mention_still_selects_tech(self):
        from enricher import detect_category

        self.assertEqual(
            detect_category("The app crossed 10 million downloads", default="Markets"),
            "Tech",
        )


class NormalizationTests(unittest.TestCase):
    def test_ids_and_aliases_are_accepted(self):
        self.assertEqual(
            normalize_ids(["Tech", "Cybersecurity", "AI"]),
            ["technology", "artificial-intelligence", "cybersecurity"],
        )

    def test_duplicates_are_removed_and_order_is_canonical(self):
        self.assertEqual(
            normalize_ids(["sports", "technology", "Tech"]),
            ["technology", "sports"],
        )

    def test_unknown_ids_are_rejected(self):
        with self.assertRaises(ValueError) as ctx:
            normalize_ids(["technology", "not-a-category"])
        self.assertIn("not-a-category", ctx.exception.args[0])

    def test_empty_selection_is_allowed(self):
        self.assertEqual(normalize_ids([]), [])
        self.assertEqual(normalize_ids(None), [])


class DatabaseTestCase(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine, autoflush=False)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def add_article(self, article_id="a1", headline="Ransomware attack hits hospital", legacy="Tech"):
        self.db.add(
            Article(
                id=article_id,
                headline=headline,
                summary="",
                category=legacy,
                url="https://example.test/a1",
                entities=[],
            )
        )
        self.db.commit()
        return article_id


class PersistenceTests(DatabaseTestCase):
    def test_sync_creates_rows_and_is_idempotent(self):
        article_id = self.add_article()
        categorization.sync_article_categories(
            self.db, article_id, "Ransomware attack hits hospital", "", "Tech"
        )
        self.db.commit()
        first = self.db.query(ArticleCategory).all()
        categorization.sync_article_categories(
            self.db, article_id, "Ransomware attack hits hospital", "", "Tech"
        )
        self.db.commit()
        second = self.db.query(ArticleCategory).all()

        self.assertEqual(
            sorted((row.category, row.source) for row in first),
            sorted((row.category, row.source) for row in second),
        )
        categories = {row.category for row in second}
        self.assertIn("cybersecurity", categories)
        self.assertIn("technology", categories)
        self.assertIn("healthcare", categories)

    def test_manual_assignment_is_preserved(self):
        article_id = self.add_article()
        self.db.add(
            ArticleCategory(
                article_id=article_id,
                category="sports",
                source=SOURCE_MANUAL,
            )
        )
        self.db.commit()

        categorization.sync_article_categories(
            self.db, article_id, "Ransomware attack hits hospital", "", "Tech"
        )
        self.db.commit()

        rows = {
            (row.category, row.source)
            for row in self.db.query(ArticleCategory).all()
        }
        self.assertIn(("sports", SOURCE_MANUAL), rows)
        self.assertIn(("cybersecurity", "keyword"), rows)
        self.assertIn(("technology", "legacy"), rows)

    def test_backfill_updates_primary_label_and_counts(self):
        self.add_article()
        report = categorization.backfill_categories(self.db)

        self.assertEqual(report["failed"], 0)
        self.assertEqual(report["updated"], 1)
        article = self.db.query(Article).filter(Article.id == "a1").one()
        self.assertEqual(article.category, "Technology")

        counts = categorization.category_counts(self.db)
        self.assertGreaterEqual(counts.get("cybersecurity", 0), 1)

        mapping = categorization.categories_for_articles(self.db, ["a1"])
        self.assertIn("cybersecurity", mapping["a1"])

    def test_backfill_is_idempotent(self):
        self.add_article()
        categorization.backfill_categories(self.db)
        first = self.db.query(ArticleCategory).count()
        categorization.backfill_categories(self.db)
        second = self.db.query(ArticleCategory).count()
        self.assertEqual(first, second)


if __name__ == "__main__":
    unittest.main()
