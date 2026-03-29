from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models import AttentionSignal, UserProfile
from schemas import AttentionIn
import json

router = APIRouter()

def update_user_profile(signal: dict, db: Session):
    from models import Article
    article = db.query(Article).filter(
        Article.id == signal["article_id"]
    ).first()
    if not article:
        return
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == signal["user_id"]
    ).first()
    if not profile:
        profile = UserProfile(
            id=signal["user_id"],
            user_id=signal["user_id"],
            category_weights={},
            entity_interests=[],
        )
        db.add(profile)
    weights = profile.category_weights or {}
    if isinstance(weights, str):
        try:
            weights = json.loads(weights)
        except Exception:
            weights = {}
    category = article.category or "General"
    engagement = min(signal["dwell_seconds"] / 60.0, 1.0)
    if signal["clicked"]:
        engagement += 0.3
    if signal["scroll_depth"] > 0.7:
        engagement += 0.2
    current = weights.get(category, 0.0)
    weights[category] = round(
        current * 0.8 + engagement * 0.2, 3
    )
    profile.category_weights = weights
    db.commit()

@router.post("/")
def record_attention(
    signal: AttentionIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    db_signal = AttentionSignal(
        user_id=signal.user_id,
        article_id=signal.article_id,
        dwell_seconds=signal.dwell_seconds,
        scroll_depth=signal.scroll_depth,
        clicked=signal.clicked,
    )
    db.add(db_signal)
    db.commit()
    background_tasks.add_task(
        update_user_profile,
        signal.dict(),
        db,
    )
    return {"status": "recorded"}
