from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Article
from schemas import ArticleOut
import json

router = APIRouter()

@router.get("/{article_id}", response_model=ArticleOut)
def get_article(article_id: str, db: Session = Depends(get_db)):
    article = db.query(Article).filter(
        Article.id == article_id
    ).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    entities = article.entities
    if isinstance(entities, str):
        try:
            entities = json.loads(entities)
        except Exception:
            entities = []
    return ArticleOut(
        id=article.id,
        headline=article.headline,
        summary=article.summary,
        source=article.source,
        category=article.category,
        url=article.url,
        published_at=article.published_at,
        read_time=article.read_time or 3,
        sentiment_label=article.sentiment_label or "neutral",
        entities=entities,
        is_personalised=False,
    )
