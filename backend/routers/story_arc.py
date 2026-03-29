from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Article
from groq import Groq
import os
import json
from collections import defaultdict, Counter
from datetime import datetime
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Optional

load_dotenv()
router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class TimelineEvent(BaseModel):
    date: str
    headline: str
    source: str
    sentiment: str
    article_id: str

class KeyPlayer(BaseModel):
    name: str
    mention_count: int

class StoryArc(BaseModel):
    id: str
    title: str
    description: str
    timeline: List[TimelineEvent]
    key_players: List[KeyPlayer]
    overall_sentiment: str
    sentiment_trend: str
    what_to_watch: str
    article_count: int

@router.get("/", response_model=List[StoryArc])
def get_story_arcs(db: Session = Depends(get_db)):
    articles = db.query(Article).order_by(
        Article.published_at.desc()
    ).limit(60).all()
    
    entity_articles = defaultdict(list)
    
    for a in articles:
        entities = a.entities
        if isinstance(entities, str):
            try:
                entities = json.loads(entities)
            except Exception:
                entities = []
        for entity in entities:
            if len(entity) > 4 and len(entity) < 50:
                entity_articles[entity].append(a)
    
    arc_entities = {
        e: arts for e, arts in entity_articles.items() 
        if len(arts) >= 2
    }
    
    sorted_entities = sorted(
        arc_entities.items(),
        key=lambda x: len(x[1]),
        reverse=True
    )[:5]
    
    arcs = []
    for entity, arts in sorted_entities:
        arts_sorted = sorted(
            arts,
            key=lambda a: a.published_at or datetime.min
        )
        
        timeline = []
        for a in arts_sorted[:6]:
            timeline.append(TimelineEvent(
                date=a.published_at.strftime("%d %b") 
                    if a.published_at else "Recent",
                headline=a.headline[:80] + "..." 
                    if len(a.headline) > 80 else a.headline,
                source=a.source,
                sentiment=a.sentiment_label or "neutral",
                article_id=a.id,
            ))
        
        all_entities = []
        for a in arts:
            ents = a.entities
            if isinstance(ents, str):
                try:
                    ents = json.loads(ents)
                except Exception:
                    ents = []
            all_entities.extend(ents)
        
        entity_counts = Counter(all_entities)
        key_players = [
            KeyPlayer(name=e, mention_count=c)
            for e, c in entity_counts.most_common(4)
            if e != entity and len(e) > 3
        ]
        
        sentiments = [a.sentiment_label or "neutral" for a in arts]
        pos = sentiments.count("positive")
        neg = sentiments.count("negative")
        
        if pos > neg * 1.5:
            overall = "positive"
        elif neg > pos * 1.5:
            overall = "negative"
        else:
            overall = "neutral"
        
        first_half = sentiments[:len(sentiments)//2]
        second_half = sentiments[len(sentiments)//2:]
        first_pos = first_half.count("positive") / max(len(first_half), 1)
        second_pos = second_half.count("positive") / max(len(second_half), 1)
        
        if second_pos > first_pos + 0.2:
            trend = "improving"
        elif first_pos > second_pos + 0.2:
            trend = "declining"
        else:
            trend = "stable"
        
        headlines_text = "\n".join([
            f"- {a.headline} ({a.source}, {a.sentiment_label})"
            for a in arts[:8]
        ])
        
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You are a financial news analyst. Return only valid JSON, no markdown."
                },
                {
                    "role": "user",
                    "content": f"""Based on these articles about "{entity}":
{headlines_text}

Return JSON with exactly:
{{"description": "2 sentence story summary", "what_to_watch": "1 sentence prediction"}}"""
                }
            ],
            temperature=0.4,
            max_tokens=150,
        )
        
        raw = completion.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        try:
            ai_content = json.loads(raw)
        except Exception:
            ai_content = {
                "description": f"Ongoing story tracking {entity} across {len(arts)} articles.",
                "what_to_watch": f"Monitor {entity} for further developments."
            }
        
        arcs.append(StoryArc(
            id=entity.lower().replace(" ", "-"),
            title=entity,
            description=ai_content.get("description", ""),
            timeline=timeline,
            key_players=key_players[:4],
            overall_sentiment=overall,
            sentiment_trend=trend,
            what_to_watch=ai_content.get("what_to_watch", ""),
            article_count=len(arts),
        ))
    
    return arcs
