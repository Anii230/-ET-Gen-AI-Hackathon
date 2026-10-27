import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import UserProfile
from taxonomy import normalize_ids

router = APIRouter()


class PreferencesIn(BaseModel):
    user_id: str
    categories: Optional[List[str]] = None
    topics: Optional[List[str]] = None
    sources: List[str] = []
    depth: str = "both"


def _raw_interests(profile: Optional[UserProfile]) -> List[str]:
    if not profile:
        return []
    stored = profile.entity_interests or []
    if isinstance(stored, str):
        try:
            stored = json.loads(stored)
        except Exception:  # noqa: BLE001
            stored = []
    return list(stored)


def _saved_categories(profile: Optional[UserProfile]) -> List[str]:
    # Unknown legacy values are ignored rather than failing the whole profile.
    return normalize_ids(_raw_interests(profile), strict=False)


@router.post("/preferences")
def save_preferences(
    prefs: PreferencesIn,
    db: Session = Depends(get_db),
):
    # ``categories`` is the canonical field. ``topics`` remains accepted so
    # existing clients keep working; aliases such as "Tech" are resolved.
    raw = prefs.categories if prefs.categories is not None else (prefs.topics or [])
    try:
        categories = normalize_ids(raw)
    except ValueError as exc:
        unknown = ", ".join(str(item) for item in exc.args[0])
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported category: {unknown}",
        ) from exc

    profile = (
        db.query(UserProfile).filter(UserProfile.user_id == prefs.user_id).first()
    )

    try:
        if not profile:
            profile = UserProfile(
                id=prefs.user_id,
                user_id=prefs.user_id,
                category_weights={},
                entity_interests=categories,
            )
            db.add(profile)
        else:
            # Only the explicit selection is replaced. Engagement weights and
            # other profile fields are preserved.
            profile.entity_interests = categories
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "status": "saved",
        "categories": categories,
        "weights": profile.category_weights or {},
    }


@router.get("/{user_id}/profile")
def get_profile(user_id: str, db: Session = Depends(get_db)):
    profile = (
        db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    )
    if not profile:
        return {
            "user_id": user_id,
            "category_weights": {},
            "topic_preferences": [],
            "categories": [],
        }
    return {
        "user_id": user_id,
        "category_weights": profile.category_weights or {},
        "topic_preferences": _raw_interests(profile),
        "categories": _saved_categories(profile),
    }
