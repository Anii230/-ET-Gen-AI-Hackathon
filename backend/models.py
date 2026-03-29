from sqlalchemy import Column, String, Float, Boolean, Integer, DateTime, Text, JSON
from sqlalchemy.sql import func
from database import Base

class Article(Base):
    __tablename__ = "articles"
    id = Column(String, primary_key=True)
    headline = Column(String, nullable=False)
    summary = Column(Text)
    content = Column(Text)
    source = Column(String)
    category = Column(String)
    url = Column(String)
    image_url = Column(String, nullable=True)
    published_at = Column(DateTime)
    read_time = Column(Integer, default=3)
    sentiment_score = Column(Float, default=0.0)
    sentiment_label = Column(String, default="neutral")
    entities = Column(JSON, default=list)
    enriched = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

class UserProfile(Base):
    __tablename__ = "user_profiles"
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, unique=True)
    category_weights = Column(JSON, default=dict)
    entity_interests = Column(JSON, default=list)
    avg_read_time = Column(Float, default=0.0)
    total_sessions = Column(Integer, default=0)
    updated_at = Column(DateTime, server_default=func.now())

class AttentionSignal(Base):
    __tablename__ = "attention_signals"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False)
    article_id = Column(String, nullable=False)
    dwell_seconds = Column(Float, default=0.0)
    scroll_depth = Column(Float, default=0.0)
    clicked = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

class Bookmark(Base):
    __tablename__ = "bookmarks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False)
    article_id = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
