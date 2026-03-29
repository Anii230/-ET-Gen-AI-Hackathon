from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models import Article, UserProfile
from schemas import ArticleOut
from fetcher import fetch_rss_articles, fetch_newsapi_articles
from enricher import enrich_article
from typing import List
import json

router = APIRouter()

def upsert_articles(articles: list, db: Session):
    for art in articles:
        existing = db.query(Article).filter(
            Article.id == art["id"]
        ).first()
        if not existing:
            enriched = enrich_article(art)
            db_article = Article(**{
                k: v for k, v in enriched.items()
                if k in Article.__table__.columns.keys()
            })
            if isinstance(db_article.entities, list):
                db_article.entities = json.dumps(db_article.entities)
            db.add(db_article)
    db.commit()

def get_user_profile(user_id: str, db: Session) -> dict:
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == user_id
    ).first()
    if not profile:
        return {}
    return profile.category_weights or {}

def rank_articles(
    articles: list, 
    category_weights: dict
) -> list:
    def score(a):
        # Base score starts high for newness (implicit in current pool)
        # We boost matching categories aggressively (10x weight)
        cat_weight = category_weights.get(a.category, 0)
        cat_boost = cat_weight * 10.0
        sentiment_boost = 0.5 if a.sentiment_label == "positive" else 0
        return cat_boost + sentiment_boost
    return sorted(articles, key=score, reverse=True)

@router.get("/", response_model=List[ArticleOut])
def get_feed(db: Session = Depends(get_db)):
    raw = fetch_rss_articles()
    if len(raw) < 10:
        raw += fetch_newsapi_articles()
    upsert_articles(raw, db)
    articles = db.query(Article).order_by(
        Article.published_at.desc()
    ).limit(30).all()
    result = []
    for a in articles:
        entities = a.entities
        if isinstance(entities, str):
            try:
                entities = json.loads(entities)
            except Exception:
                entities = []
        result.append(ArticleOut(
            id=a.id,
            headline=a.headline,
            summary=a.summary,
            source=a.source,
            category=a.category,
            url=a.url,
            image_url=a.image_url,
            published_at=a.published_at,
            read_time=a.read_time or 3,
            sentiment_label=a.sentiment_label or "neutral",
            entities=entities,
            is_personalised=False,
        ))
    return result

@router.get("/personalised", response_model=List[ArticleOut])
def get_personalised_feed(
    user_id: str = "demo_user",
    db: Session = Depends(get_db)
):
    # Deep pool search to find enough matching articles
    articles = db.query(Article).order_by(
        Article.published_at.desc()
    ).limit(100).all()
    category_weights = get_user_profile(user_id, db)
    ranked = rank_articles(articles, category_weights)[:30]
    result = []
    for a in ranked:
        entities = a.entities
        if isinstance(entities, str):
            try:
                entities = json.loads(entities)
            except Exception:
                entities = []
        result.append(ArticleOut(
            id=a.id,
            headline=a.headline,
            summary=a.summary,
            source=a.source,
            category=a.category,
            url=a.url,
            image_url=a.image_url,
            published_at=a.published_at,
            read_time=a.read_time or 3,
            sentiment_label=a.sentiment_label or "neutral",
            entities=entities,
            is_personalised=True,
        ))
    return result

@router.get("/trending-topics")
def get_trending_topics(db: Session = Depends(get_db)):
    from collections import Counter
    import json
    
    articles = db.query(Article).order_by(
        Article.published_at.desc()
    ).limit(50).all()
    
    entity_counts = Counter()
    category_counts = Counter()
    
    for a in articles:
        entities = a.entities
        if isinstance(entities, str):
            try:
                entities = json.loads(entities)
            except Exception:
                entities = []
        for e in entities:
            if len(e) > 3 and len(e) < 40:
                entity_counts[e] += 1
        if a.category:
            category_counts[a.category] += 1
    
    topics = []
    for entity, count in entity_counts.most_common(12):
        if count >= 2:
            topics.append({
                "label": entity,
                "type": "entity",
                "count": count
            })
    
    for category, count in category_counts.most_common(5):
        topics.append({
            "label": category,
            "type": "category", 
            "count": count
        })
    
    return {"topics": topics[:15]}
