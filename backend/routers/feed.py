import base64
import json
import logging
import os
import threading
import time
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from categorization import (
    categories_for_articles,
    category_counts,
    sync_article_categories,
)
from database import get_db
from enricher import enrich_article
from fetcher import fetch_newsapi_articles, fetch_rss_articles
from models import Article, ArticleCategory, UserProfile
from schemas import ArticleOut, CategoriesOut, CategoryInfo, FeedPage
from taxonomy import (
    category_infos,
    label_for,
    normalize_ids,
    primary_category_id,
)

logger = logging.getLogger("et_news.feed")

router = APIRouter()

DEFAULT_LIMIT = 12
MAX_LIMIT = 50
EPOCH = datetime(1970, 1, 1)

# In-process ingestion throttle. Pagination and tab switches must not trigger
# another round of RSS fetches; configurable for long-running deployments.
INGEST_INTERVAL_SECONDS = int(os.getenv("FEED_INGEST_INTERVAL_SECONDS", "120"))
_ingest_lock = threading.Lock()
_last_ingest_at = 0.0


def upsert_articles(articles: list, db: Session) -> int:
    """Insert new articles and their canonical categories.

    Existing rows are never modified here, so manual category assignments and
    stored enrichment remain untouched.
    """
    added = 0
    for art in articles:
        existing = db.query(Article.id).filter(Article.id == art["id"]).first()
        if existing:
            continue

        enriched = dict(art)
        source_category = art.get("category")
        try:
            enriched = enrich_article(enriched)
        except Exception:  # noqa: BLE001 - one bad article must not stop ingestion
            logger.exception("Enrichment failed for article %s", art.get("id"))

        payload = {
            key: value
            for key, value in enriched.items()
            if key in Article.__table__.columns.keys()
        }
        db_article = Article(**payload)
        if isinstance(db_article.entities, list):
            db_article.entities = json.dumps(db_article.entities)
        db.add(db_article)
        db.flush()

        # Prefer the source feed's own label over the enricher's guess as the
        # legacy signal: the feed knows which section the story came from.
        legacy = source_category or enriched.get("category")
        desired = sync_article_categories(
            db,
            db_article.id,
            enriched.get("headline"),
            enriched.get("summary"),
            legacy,
        )
        label = label_for(primary_category_id(desired, legacy))
        if label:
            db_article.category = label
        added += 1

    db.commit()
    return added


def _maybe_ingest(db: Session) -> None:
    """Refresh the article pool at most once per interval.

    A non-blocking lock means concurrent first-page requests do not pile up;
    a failed refresh is logged and never breaks the feed response.
    """
    global _last_ingest_at

    now = time.monotonic()
    if now - _last_ingest_at < INGEST_INTERVAL_SECONDS:
        return
    if not _ingest_lock.acquire(blocking=False):
        return

    try:
        now = time.monotonic()
        if now - _last_ingest_at < INGEST_INTERVAL_SECONDS:
            return
        try:
            raw = fetch_rss_articles()
            if len(raw) < 10:
                raw += fetch_newsapi_articles()
            inserted = upsert_articles(raw, db)
            logger.info(
                "Feed ingestion complete: fetched=%d inserted=%d", len(raw), inserted
            )
        except Exception:  # noqa: BLE001 - serve existing rows on failure
            logger.exception("Feed ingestion failed; serving stored articles")
            db.rollback()
        _last_ingest_at = time.monotonic()
    finally:
        _ingest_lock.release()


def _fingerprint(scope: str, categories: List[str], user_id: Optional[str] = None) -> str:
    import hashlib

    raw = f"{scope}|{user_id or ''}|{','.join(categories)}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:12]


def _encode_cursor(article: Article, fingerprint: str) -> str:
    payload = {
        "t": (article.published_at or EPOCH).isoformat(),
        "i": article.id,
        "f": fingerprint,
    }
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _decode_cursor(cursor: str, fingerprint: str) -> tuple[datetime, str]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")))
        if payload.get("f") != fingerprint:
            raise HTTPException(
                status_code=400,
                detail="Your feed filters changed. Reload the feed to continue.",
            )
        published = datetime.fromisoformat(payload["t"])
        article_id = str(payload["i"])
        if not article_id:
            raise ValueError("missing id")
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - all malformed cursors are 400
        raise HTTPException(
            status_code=400,
            detail="Invalid pagination cursor. Reload the feed to continue.",
        ) from exc
    return published, article_id


def _apply_cursor(query, cursor: Optional[str], fingerprint: str):
    if not cursor:
        return query
    published, article_id = _decode_cursor(cursor, fingerprint)
    published_expr = func.coalesce(Article.published_at, EPOCH)
    return query.filter(
        or_(
            published_expr < published,
            and_(published_expr == published, Article.id < article_id),
        )
    )


def _serialize(article: Article, categories: Dict[str, List[str]]) -> ArticleOut:
    entities = article.entities
    if isinstance(entities, str):
        try:
            entities = json.loads(entities)
        except Exception:  # noqa: BLE001
            entities = []
    return ArticleOut(
        id=article.id,
        headline=article.headline,
        summary=article.summary,
        source=article.source or "Unknown",
        category=article.category or "General",
        categories=categories.get(article.id, []),
        url=article.url,
        image_url=article.image_url,
        published_at=article.published_at,
        read_time=article.read_time or 3,
        sentiment_label=article.sentiment_label or "neutral",
        entities=entities or [],
        is_personalised=False,
    )


def _paginate(
    db: Session,
    query,
    limit: int,
    cursor: Optional[str],
    fingerprint: str,
    *,
    personalised: bool = False,
) -> FeedPage:
    query = _apply_cursor(query, cursor, fingerprint)
    rows = (
        query.order_by(
            func.coalesce(Article.published_at, EPOCH).desc(),
            Article.id.desc(),
        )
        .limit(limit + 1)
        .all()
    )

    has_more = len(rows) > limit
    rows = rows[:limit]
    categories = categories_for_articles(db, [article.id for article in rows])

    articles = []
    for article in rows:
        out = _serialize(article, categories)
        out.is_personalised = personalised
        articles.append(out)

    next_cursor = _encode_cursor(rows[-1], fingerprint) if has_more and rows else None
    return FeedPage(articles=articles, has_more=has_more, next_cursor=next_cursor)


def _resolve_categories(
    user_id: str,
    raw_categories: Optional[str],
    db: Session,
) -> List[str]:
    if raw_categories is not None:
        values = [value for value in raw_categories.split(",") if value.strip()]
        try:
            return normalize_ids(values)
        except ValueError as exc:
            unknown = ", ".join(str(item) for item in exc.args[0])
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported category: {unknown}",
            ) from exc

    profile = (
        db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    )
    if not profile:
        return []
    stored = profile.entity_interests or []
    if isinstance(stored, str):
        try:
            stored = json.loads(stored)
        except Exception:  # noqa: BLE001
            stored = []
    # Old profiles may contain labels that no longer exist; ignore those
    # rather than breaking the feed.
    return normalize_ids(stored, strict=False)


@router.get("/", response_model=FeedPage)
def get_feed(
    cursor: Optional[str] = Query(None),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    db: Session = Depends(get_db),
):
    """General feed. Never affected by personalization preferences."""
    fingerprint = _fingerprint("general", [])
    if cursor is None:
        _maybe_ingest(db)
    return _paginate(db, db.query(Article), limit, cursor, fingerprint)


@router.get("/categories", response_model=CategoriesOut)
def get_categories(db: Session = Depends(get_db)):
    counts = category_counts(db)
    return CategoriesOut(
        categories=[CategoryInfo(**info) for info in category_infos(counts)]
    )


@router.get("/personalised", response_model=FeedPage)
def get_personalised_feed(
    user_id: str = Query("demo_user"),
    categories: Optional[str] = Query(
        None,
        description="Comma-separated canonical category IDs. Omit to use saved preferences.",
    ),
    cursor: Optional[str] = Query(None),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    db: Session = Depends(get_db),
):
    selected = _resolve_categories(user_id, categories, db)
    fingerprint = _fingerprint("personalised", selected, user_id)

    if not selected:
        # No preferences is an honest empty state, never a General fallback.
        return FeedPage(articles=[], has_more=False, next_cursor=None)

    if cursor is None:
        _maybe_ingest(db)

    matching = (
        db.query(ArticleCategory.article_id)
        .filter(
            ArticleCategory.article_id == Article.id,
            ArticleCategory.category.in_(selected),
        )
        .exists()
    )
    query = db.query(Article).filter(matching)
    return _paginate(
        db,
        query,
        limit,
        cursor,
        fingerprint,
        personalised=True,
    )


@router.get("/trending-topics")
def get_trending_topics(db: Session = Depends(get_db)):
    from collections import Counter

    articles = (
        db.query(Article).order_by(Article.published_at.desc()).limit(50).all()
    )

    entity_counts = Counter()
    category_counts_result = Counter()

    for article in articles:
        entities = article.entities
        if isinstance(entities, str):
            try:
                entities = json.loads(entities)
            except Exception:  # noqa: BLE001
                entities = []
        for entity in entities or []:
            if 3 < len(entity) < 40:
                entity_counts[entity] += 1
        if article.category:
            category_counts_result[article.category] += 1

    topics = []
    for entity, count in entity_counts.most_common(12):
        if count >= 2:
            topics.append({"label": entity, "type": "entity", "count": count})

    for category, count in category_counts_result.most_common(5):
        topics.append({"label": category, "type": "category", "count": count})

    return {"topics": topics[:15]}
