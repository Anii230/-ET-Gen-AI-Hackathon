from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Article
from schemas import ChatIn, ChatOut
from groq import Groq
import os
import json
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@router.post("/", response_model=ChatOut)
def chat(payload: ChatIn, db: Session = Depends(get_db)):
    
    article_context = ""
    if payload.article_id:
        article = db.query(Article).filter(
            Article.id == payload.article_id
        ).first()
        if article:
            entities = article.entities
            if isinstance(entities, str):
                try:
                    entities = json.loads(entities)
                except Exception:
                    entities = []
            article_context = f"""
The user is asking about this specific article:

HEADLINE: {article.headline}
SOURCE: {article.source}
CATEGORY: {article.category}
SUMMARY: {article.summary or 'No summary available'}
ENTITIES MENTIONED: {', '.join(entities) if entities else 'None'}
SENTIMENT: {article.sentiment_label}
URL: {article.url}

Use this article as your primary context for answering.
"""

    recent_articles = db.query(Article).order_by(
        Article.published_at.desc()
    ).limit(10).all()
    
    news_context = "RECENT NEWS CONTEXT:\n"
    for a in recent_articles:
        news_context += f"- {a.headline} ({a.source}, {a.category})\n"

    system_prompt = f"""You are ET AI News Navigator — an intelligent 
news assistant for Indian business and financial news.

{article_context if article_context else news_context}

Rules:
- Always cite sources by name
- Be specific and factual
- Keep responses under 200 words
- If asked to explain an article, use the article context above
- Never say "there's no article provided" if article context exists"""

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": payload.message},
        ],
        temperature=0.7,
        max_tokens=400,
    )
    response_text = completion.choices[0].message.content
    return ChatOut(response=response_text, sources=[])
