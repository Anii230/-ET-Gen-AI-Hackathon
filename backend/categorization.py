"""Database helpers for the canonical category taxonomy.

Kept separate from :mod:`taxonomy` so the rules stay pure and testable.

Safety rules
------------
* Automatic rows (``legacy`` / ``keyword`` / ``legacy+keyword``) are
  recomputed on every sync; rows with ``source='manual'`` are never deleted
  or overwritten.
* The composite primary key ``(article_id, category)`` makes re-runs
  idempotent.
* :func:`backfill_categories` commits in batches and rolls the batch back on
  failure, so a bad run cannot leave half-updated articles behind.
"""

from __future__ import annotations

import logging
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Article, ArticleCategory
from taxonomy import (
    CATEGORY_ORDER,
    SOURCE_MANUAL,
    classify,
    label_for,
    primary_category_id,
)

logger = logging.getLogger("et_news.taxonomy")


def _manual_categories(db: Session, article_id: str) -> set[str]:
    rows = (
        db.query(ArticleCategory.category)
        .filter(
            ArticleCategory.article_id == article_id,
            ArticleCategory.source == SOURCE_MANUAL,
        )
        .all()
    )
    return {row[0] for row in rows}


def sync_article_categories(
    db: Session,
    article_id: str,
    headline: Optional[str],
    summary: Optional[str],
    legacy: Optional[str],
    *,
    commit: bool = False,
) -> List[Tuple[str, str]]:
    """Recompute the automatic categories for one article.

    Existing rows are updated in place where possible, so re-running never
    deletes and re-inserts the same primary key. Manual rows are excluded
    from both the read and the delete. Returns the applied classifications.
    """
    classifications = classify(headline, summary, legacy)
    manual = _manual_categories(db, article_id)
    desired = [(cid, source) for cid, source in classifications if cid not in manual]
    desired_ids = {cid for cid, _source in desired}

    existing_rows = (
        db.query(ArticleCategory)
        .filter(
            ArticleCategory.article_id == article_id,
            ArticleCategory.source != SOURCE_MANUAL,
        )
        .all()
    )
    existing_by_category = {row.category: row for row in existing_rows}

    for category_id, source in desired:
        row = existing_by_category.get(category_id)
        if row is None:
            db.add(
                ArticleCategory(
                    article_id=article_id,
                    category=category_id,
                    source=source,
                )
            )
        elif row.source != source:
            row.source = source

    for row in existing_rows:
        if row.category not in desired_ids:
            db.delete(row)

    if commit:
        db.commit()
    return desired


def backfill_categories(db: Session, batch_size: int = 200) -> Dict[str, int]:
    """Idempotently rebuild automatic categories for every stored article.

    Manual assignments survive. Returns a small report for logs/tests.
    """
    total = 0
    updated = 0
    failed = 0

    rows = db.query(Article.id, Article.headline, Article.summary, Article.category).all()
    for start in range(0, len(rows), batch_size):
        batch = rows[start : start + batch_size]
        try:
            for article_id, headline, summary, legacy in batch:
                total += 1
                desired = sync_article_categories(
                    db,
                    article_id,
                    headline,
                    summary,
                    legacy,
                )
                label = label_for(primary_category_id(desired, legacy))
                if label:
                    db.query(Article).filter(Article.id == article_id).update(
                        {Article.category: label},
                        synchronize_session=False,
                    )
                updated += 1
            db.commit()
        except Exception:  # noqa: BLE001 - startup must not crash on one batch
            db.rollback()
            failed += len(batch)
            logger.exception(
                "Category backfill failed for a batch of %d articles", len(batch)
            )

    report = {"total": total, "updated": updated, "failed": failed}
    logger.info(
        "Category backfill complete: total=%d updated=%d failed=%d",
        total,
        updated,
        failed,
    )
    return report


def category_counts(
    db: Session,
    article_ids: Optional[Iterable[str]] = None,
) -> Dict[str, int]:
    query = db.query(ArticleCategory.category, func.count(ArticleCategory.article_id))
    if article_ids is not None:
        ids = list(article_ids)
        if not ids:
            return {}
        query = query.filter(ArticleCategory.article_id.in_(ids))
    query = query.group_by(ArticleCategory.category)
    return {category: int(count) for category, count in query.all()}


def categories_for_articles(
    db: Session,
    article_ids: Sequence[str],
) -> Dict[str, List[str]]:
    """Return canonical IDs per article, ordered by taxonomy priority."""
    if not article_ids:
        return {}
    rows = (
        db.query(ArticleCategory.article_id, ArticleCategory.category)
        .filter(ArticleCategory.article_id.in_(list(article_ids)))
        .all()
    )
    mapping: Dict[str, List[str]] = {}
    for article_id, category in rows:
        mapping.setdefault(article_id, []).append(category)
    for categories in mapping.values():
        categories.sort(key=lambda cid: CATEGORY_ORDER.get(cid, 999))
    return mapping
