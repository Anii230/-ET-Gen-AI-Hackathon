from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import UserProfile
from pydantic import BaseModel
from typing import List
import json

router = APIRouter()

class PreferencesIn(BaseModel):
    user_id: str
    topics: List[str]
    sources: List[str]
    depth: str = "both"

@router.post("/preferences")
def save_preferences(
    prefs: PreferencesIn,
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == prefs.user_id
    ).first()
    
    initial_weights = {}
    topic_to_category = {
        "Markets": "Markets",
        "Economy": "Economy", 
        "Tech": "Tech",
        "Startups": "Startups",
        "Policy": "Policy",
        "Science": "Science",
        "AI": "Tech",
    }
    for topic in prefs.topics:
        category = topic_to_category.get(topic, topic)
        initial_weights[category] = 0.8
    
    if not profile:
        profile = UserProfile(
            id=prefs.user_id,
            user_id=prefs.user_id,
            category_weights=initial_weights,
            entity_interests=prefs.topics,
        )
        db.add(profile)
    else:
        profile.category_weights = initial_weights
        profile.entity_interests = prefs.topics
    
    db.commit()
    return {"status": "saved", "weights": initial_weights}

@router.get("/{user_id}/profile")
def get_profile(user_id: str, db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == user_id
    ).first()
    if not profile:
        return {"user_id": user_id, "category_weights": {}, "topic_preferences": []}
    return {
        "user_id": user_id,
        "category_weights": profile.category_weights or {},
        "topic_preferences": profile.entity_interests or [],
    }
