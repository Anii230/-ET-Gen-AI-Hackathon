from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Article, UserProfile
from agents.graph import pipeline
from pydantic import BaseModel
from typing import Optional, List
import json
from collections import Counter
import os
from groq import Groq
from fetcher import search_external_articles

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

router = APIRouter()

class BriefingRequest(BaseModel):
    user_id: str = "demo_user"
    query: Optional[str] = None
    article_ids: Optional[List[str]] = None

class BriefingResponse(BaseModel):
    briefing: str
    sources_used: List[str]
    ranked_count: int
    pipeline_steps: List[str] = ["enrichment", "ranking", "synthesis"]

@router.post("/", response_model=BriefingResponse)
def generate_briefing(
    request: BriefingRequest,
    db: Session = Depends(get_db)
):
    if request.article_ids:
        primary = db.query(Article).filter(
            Article.id.in_(request.article_ids)
        ).all()
        if primary:
            category = primary[0].category
            related = db.query(Article).filter(
                Article.category == category,
                Article.id.notin_(request.article_ids)
            ).order_by(
                Article.published_at.desc()
            ).limit(6).all()
            articles = primary + related
        else:
            articles = db.query(Article).order_by(
                Article.published_at.desc()
            ).limit(15).all()
    else:
        articles = db.query(Article).order_by(
            Article.published_at.desc()
        ).limit(15).all()
    
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == request.user_id
    ).first()
    
    user_profile = {}
    if profile:
        user_profile = {
            "category_weights": profile.category_weights or {},
            "topic_preferences": profile.entity_interests or [],
            "entity_interests": profile.entity_interests or [],
        }
    
    articles_dicts = []
    for a in articles:
        entities = a.entities
        if isinstance(entities, str):
            try:
                entities = json.loads(entities)
            except Exception:
                entities = []
        articles_dicts.append({
            "id": a.id,
            "headline": a.headline,
            "summary": a.summary or "",
            "source": a.source,
            "category": a.category,
            "sentiment_label": a.sentiment_label or "neutral",
            "entities": entities,
        })
    
    result = pipeline.invoke({
        "articles": articles_dicts,
        "user_profile": user_profile,
        "query": request.query or "",
        "enriched_articles": [],
        "ranked_articles": [],
        "briefing": None,
        "sources_used": [],
        "error": None,
    })
    
    return BriefingResponse(
        briefing=result["briefing"],
        sources_used=result["sources_used"],
        ranked_count=len(result["ranked_articles"]),
    )

class TopicBriefingRequest(BaseModel):
    topic: str
    user_id: str = "demo_user"

class AngleBriefing(BaseModel):
    angle: str
    content: str
    article_count: int

class TopicBriefingResponse(BaseModel):
    topic: str
    total_articles: int
    angles: List[AngleBriefing]
    key_entities: List[str]
    sentiment_summary: str
    what_to_watch: str
    article_ids: List[str]

@router.post("/topic", response_model=TopicBriefingResponse)
def generate_topic_briefing(
    request: TopicBriefingRequest,
    db: Session = Depends(get_db)
):
    from sqlalchemy import or_
    topic_lower = request.topic.lower()
    
    all_articles = db.query(Article).order_by(
        Article.published_at.desc()
    ).limit(50).all()
    
    related = []
    for a in all_articles:
        text = f"{a.headline} {a.summary or ''}".lower()
        if topic_lower in text or any(
            word in text 
            for word in topic_lower.split()
            if len(word) > 3
        ):
            related.append(a)
    
    if len(related) < 5:
        # We need more context, so search the web (NewsAPI /everything)
        from routers.feed import upsert_articles
        external = search_external_articles(request.topic, limit=12)
        if external:
            upsert_articles(external, db)
            # Re-fetch related with the new articles
            all_articles = db.query(Article).order_by(
                Article.published_at.desc()
            ).limit(100).all()
            related = []
            for a in all_articles:
                text = f"{a.headline} {a.summary or ''}".lower()
                if topic_lower in text or any(word in text for word in topic_lower.split() if len(word) > 3):
                    related.append(a)
    
    # Final fallback if still empty
    if not related:
        related = db.query(Article).order_by(Article.published_at.desc()).limit(10).all()
    
    articles_text = ""
    article_ids = []
    all_entities = []
    sentiments = []
    
    for i, a in enumerate(related[:12], 1):
        entities = a.entities
        if isinstance(entities, str):
            try:
                entities = json.loads(entities)
            except Exception:
                entities = []
        all_entities.extend(entities)
        sentiments.append(a.sentiment_label or "neutral")
        article_ids.append(a.id)
        articles_text += f"""
Article {i} [{a.source}] [{a.category}] [{a.sentiment_label}]:
{a.headline}
{a.summary or ''}
---"""
    
    entity_counts = Counter(all_entities)
    top_entities = [e for e, _ in entity_counts.most_common(8)]
    
    pos = sentiments.count("positive")
    neg = sentiments.count("negative")
    if pos > neg:
        sentiment_summary = f"Overall positive sentiment ({pos}/{len(sentiments)} articles bullish)"
    elif neg > pos:
        sentiment_summary = f"Mixed to negative sentiment ({neg}/{len(sentiments)} articles cautious)"
    else:
        sentiment_summary = f"Neutral sentiment across {len(sentiments)} articles"
    
    prompt = f"""You are analyzing {len(related)} articles about "{request.topic}" for Indian business news readers.
Some of these articles are sourced from broad web intelligence to provide a complete picture.

{articles_text}

Create a structured intelligence briefing with EXACTLY these 4 angles. Each angle must draw from DIFFERENT articles and perspectives — no overlapping content.

Return ONLY a JSON object with this exact structure:
{{
  "macro_impact": "2-3 sentences on the big picture economic/policy impact. Cite specific sources.",
  "market_reaction": "2-3 sentences on how markets/stocks/investors are responding. Cite specific numbers if available.",
  "expert_view": "2-3 sentences on what analysts and experts are saying. Cite specific names/sources.",
  "what_to_watch": "2-3 sentences on the key developments to monitor going forward."
}}

Rules:
- Each section must be distinct, no repeated information
- Always cite the source publication by name
- Be specific, not generic
- If an angle has no relevant data, say so briefly"""

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are an expert Indian financial analyst. Return only valid JSON, no markdown, no backticks."
            },
            {"role": "user", "content": prompt}
        ],
        temperature=0.5,
        max_tokens=600,
    )
    
    raw = completion.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    
    try:
        parsed = json.loads(raw)
    except Exception:
        parsed = {
            "macro_impact": "Analysis in progress.",
            "market_reaction": "Market data being compiled.",
            "expert_view": "Expert commentary being gathered.",
            "what_to_watch": "Stay tuned for updates."
        }
    
    angles = [
        AngleBriefing(
            angle="Macro Impact",
            content=parsed.get("macro_impact", ""),
            article_count=len(related)
        ),
        AngleBriefing(
            angle="Market Reaction", 
            content=parsed.get("market_reaction", ""),
            article_count=len(related)
        ),
        AngleBriefing(
            angle="Expert View",
            content=parsed.get("expert_view", ""),
            article_count=len(related)
        ),
        AngleBriefing(
            angle="What to Watch",
            content=parsed.get("what_to_watch", ""),
            article_count=len(related)
        ),
    ]
    
    return TopicBriefingResponse(
        topic=request.topic,
        total_articles=len(related),
        angles=angles,
        key_entities=top_entities,
        sentiment_summary=sentiment_summary,
        what_to_watch=parsed.get("what_to_watch", ""),
        article_ids=article_ids,
    )
