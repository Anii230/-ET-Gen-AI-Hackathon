from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ArticleOut(BaseModel):
    id: str
    headline: str
    summary: Optional[str]
    source: str
    category: str
    url: str
    image_url: Optional[str] = None
    published_at: Optional[datetime]
    read_time: int
    sentiment_label: str
    entities: List[str]
    is_personalised: bool = False

    class Config:
        from_attributes = True

class AttentionIn(BaseModel):
    user_id: str
    article_id: str
    dwell_seconds: float
    scroll_depth: float
    clicked: bool = False

class ChatIn(BaseModel):
    user_id: str
    message: str
    article_id: Optional[str] = None

class ChatOut(BaseModel):
    response: str
    sources: List[ArticleOut] = []
