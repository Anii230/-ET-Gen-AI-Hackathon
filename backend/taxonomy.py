"""Canonical news taxonomy.

Pure, dependency-free classification rules. No database or network access
lives here so the rules can be unit tested in isolation.

Design notes
------------
* The 18 canonical categories are the only values accepted by the API.
* Legacy feed/enricher labels are mapped explicitly via ``LEGACY_ALIASES``.
  An article always keeps its legacy-mapped category, even when no keyword
  rule fires, so we never have to invent coverage.
* Keyword rules are deliberately precision-first and may assign several
  categories to one article. Generic words such as "research", "global" or
  "auto" are avoided because they produced false positives against the real
  article corpus.
"""

from __future__ import annotations

import html
import re
from dataclasses import dataclass
from typing import Iterable, List, Optional, Sequence, Tuple

SOURCE_LEGACY = "legacy"
SOURCE_KEYWORD = "keyword"
SOURCE_BOTH = "legacy+keyword"
SOURCE_MANUAL = "manual"


@dataclass(frozen=True)
class Category:
    id: str
    label: str
    keywords: Tuple[str, ...] = ()


CATEGORIES: Tuple[Category, ...] = (
    Category(
        "business-economy",
        "Business & Economy",
        (
            "gdp",
            "inflation",
            "repo rate",
            "fiscal deficit",
            "budget",
            "rupee",
            "forex",
            "trade deficit",
            "imf",
            "world bank",
            "monetary policy",
            "cpi",
            "wpi",
            "economic growth",
            "recession",
            "unemployment",
            "economy",
            "economic",
            "exports",
            "imports",
            "manufacturing",
            "industrial output",
            "current account",
            "gst",
            "msme",
        ),
    ),
    Category(
        "markets-investing",
        "Markets & Investing",
        (
            "sensex",
            "nifty",
            "bse",
            "nse",
            "stock market",
            "equity",
            "shares",
            "dalal street",
            "ipo",
            "fii",
            "dii",
            "futures",
            "options trading",
            "mutual fund",
            "portfolio",
            "dividend",
            "stock",
            "stocks",
            "earnings",
            "q1 results",
            "q2 results",
            "q3 results",
            "q4 results",
            "wall street",
            "nasdaq",
            "s&p 500",
            "bond yield",
            "gold price",
            "market rally",
            "market turmoil",
        ),
    ),
    Category(
        "technology",
        "Technology",
        (
            "technology",
            "software",
            "semiconductor",
            "semiconductors",
            "chip",
            "chips",
            "smartphone",
            "smartphones",
            "cloud computing",
            "data centre",
            "data center",
            "data protection",
            "data privacy",
            "5g",
            "6g",
            "silicon",
            "gadget",
            "electronics",
            "telecom",
            "google",
            "microsoft",
            "apple",
            "meta",
            "amazon",
            "nvidia",
            "samsung",
            "bytedance",
            "tiktok",
            "satya nadella",
            "sundar pichai",
            "big tech",
            "tech sector",
        ),
    ),
    Category(
        "artificial-intelligence",
        "Artificial Intelligence",
        (
            "artificial intelligence",
            "ai",
            "machine learning",
            "deep learning",
            "llm",
            "llms",
            "large language model",
            "chatgpt",
            "openai",
            "gemini",
            "anthropic",
            "claude",
            "generative ai",
            "genai",
            "neural network",
            "algorithm",
            "ai model",
            "ai models",
            "ai boom",
            "ai bubble",
            "ai threat",
            "ai startup",
            "copilot",
            "nvidia",
        ),
    ),
    Category(
        "startups-vc",
        "Startups & Venture Capital",
        (
            "startup",
            "startups",
            "venture capital",
            "series a",
            "series b",
            "series c",
            "unicorn",
            "seed round",
            "angel investor",
            "valuation",
            "vc",
            "founder",
            "entrepreneur",
            "accelerator",
            "incubator",
            "pre-seed",
            "private equity",
            "raises funding",
            "raised funding",
            "raises $",
            "raised $",
            "raises rs",
            "raised rs",
            "raises ₹",
            "raised ₹",
        ),
    ),
    Category(
        "science-research",
        "Science & Research",
        (
            "isro",
            "nasa",
            "space mission",
            "satellite",
            "rocket",
            "scientist",
            "laboratory",
            "genome",
            "clinical trial",
            "gaganyaan",
            "chandrayaan",
            "mars",
            "asteroid",
            "telescope",
            "physics",
            "chemistry",
            "biology",
            "quantum",
            "research paper",
            "peer-reviewed",
            "scientific",
        ),
    ),
    Category(
        "cybersecurity",
        "Cybersecurity",
        (
            "cyber",
            "cybersecurity",
            "ransomware",
            "data breach",
            "hacked",
            "hacker",
            "hackers",
            "hacking",
            "malware",
            "phishing",
            "zero-day",
            "security breach",
            "cyberattack",
            "cyber attack",
            "encryption",
            "vulnerability",
        ),
    ),
    Category(
        "politics-government",
        "Politics & Government",
        (
            "government",
            "parliament",
            "ministry",
            "minister",
            "policy",
            "policies",
            "election",
            "elections",
            "legislation",
            "supreme court",
            "high court",
            "regulation",
            "regulator",
            "cabinet",
            "opposition",
            "modi",
            "bjp",
            "white house",
            "senate",
            "trump",
            "biden",
            "legislature",
            "governance",
            "lobbying",
            "lok sabha",
            "rajya sabha",
        ),
    ),
    Category(
        "world-news",
        "World News",
        (
            "china",
            "chinese",
            "united states",
            "u.s.",
            "america",
            "american",
            "washington",
            "israel",
            "iran",
            "russia",
            "ukraine",
            "european union",
            "britain",
            "japan",
            "germany",
            "france",
            "opec",
            "middle east",
            "africa",
            "latin america",
            "australia",
        ),
    ),
    Category(
        "india-news",
        "India News",
        (
            "india",
            "indian",
            "rbi",
            "sebi",
            "sensex",
            "nifty",
            "rupee",
            "modi",
            "delhi",
            "mumbai",
            "bengaluru",
            "karnataka",
            "maharashtra",
            "tamil nadu",
            "kolkata",
            "chennai",
            "hyderabad",
            "gujarat",
            "rajasthan",
            "uttar pradesh",
            "isro",
        ),
    ),
    Category(
        "climate-environment",
        "Climate & Environment",
        (
            "climate",
            "climate change",
            "carbon",
            "emissions",
            "net zero",
            "renewable",
            "renewables",
            "green hydrogen",
            "deforestation",
            "biodiversity",
            "global warming",
            "pollution",
            "sustainability",
            "esg",
        ),
    ),
    Category(
        "energy",
        "Energy",
        (
            "energy",
            "oil",
            "crude",
            "opec",
            "refinery",
            "petrol",
            "diesel",
            "natural gas",
            "lng",
            "coal",
            "electricity",
            "power sector",
            "power plant",
            "renewable energy",
            "solar power",
            "solar energy",
            "wind energy",
            "hydrogen",
            "power grid",
            "fuel prices",
        ),
    ),
    Category(
        "healthcare",
        "Healthcare",
        (
            "health",
            "healthcare",
            "hospital",
            "pharma",
            "pharmaceutical",
            "drug",
            "vaccine",
            "biotech",
            "medical",
            "disease",
            "cancer",
            "diabetes",
            "clinical",
            "medicine",
            "zydus",
            "sun pharma",
            "cipla",
            "dr reddy",
            "apollo hospitals",
            "health insurance",
        ),
    ),
    Category(
        "education",
        "Education",
        (
            "education",
            "school",
            "schools",
            "college",
            "university",
            "student",
            "students",
            "exam",
            "exams",
            "neet",
            "iit",
            "jee",
            "upsc",
            "cbse",
            "icse",
            "scholarship",
            "admission",
            "curriculum",
            "literacy",
            "edtech",
            "coaching",
        ),
    ),
    Category(
        "sports",
        "Sports",
        (
            "ipl",
            "cricket",
            "bcci",
            "fifa",
            "football",
            "tennis",
            "badminton",
            "hockey",
            "olympics",
            "virat kohli",
            "rohit sharma",
            "ms dhoni",
            "wicket",
            "tournament",
            "championship",
            "test match",
            "odi",
            "t20",
            "world cup",
            "premier league",
            "formula 1",
            "nba",
            "kabaddi",
        ),
    ),
    Category(
        "entertainment-culture",
        "Entertainment & Culture",
        (
            "trailer",
            "movie",
            "film",
            "web series",
            "netflix",
            "amazon prime",
            "disney",
            "hotstar",
            "ott",
            "bollywood",
            "box office",
            "actor",
            "actress",
            "director",
            "streaming service",
            "episode",
            "award",
            "oscar",
            "grammy",
            "celebrity",
            "song",
            "album",
            "music",
            "museum",
            "festival",
            "theatre",
            "author",
        ),
    ),
    Category(
        "gaming",
        "Gaming",
        (
            "gaming",
            "video game",
            "video games",
            "esports",
            "console",
            "playstation",
            "xbox",
            "nintendo",
            "free fire",
            "gta",
            "grand theft auto",
            "steam",
            "valve",
            "fortnite",
            "minecraft",
            "game developer",
            "game launch",
            "mobile game",
        ),
    ),
    Category(
        "automotive-mobility",
        "Automotive & Mobility",
        (
            "automobile",
            "automotive",
            "car",
            "cars",
            "electric vehicle",
            "electric vehicles",
            "ev",
            "suv",
            "tata motors",
            "maruti",
            "hyundai",
            "mahindra",
            "ola electric",
            "bajaj auto",
            "hero motocorp",
            "truck",
            "trucks",
            "two-wheeler",
            "charging station",
            "auto sales",
            "auto industry",
            "auto sector",
            "passenger vehicle",
        ),
    ),
)

CATEGORY_BY_ID = {category.id: category for category in CATEGORIES}
CATEGORY_ORDER = {category.id: index for index, category in enumerate(CATEGORIES)}

# Legacy labels (feeds, enricher, NewsAPI) and canonical labels themselves.
LEGACY_ALIASES = {
    # legacy feed / enricher / NewsAPI labels
    "markets": "markets-investing",
    "market": "markets-investing",
    "economy": "business-economy",
    "business": "business-economy",
    "tech": "technology",
    "startups": "startups-vc",
    "startup": "startups-vc",
    "policy": "politics-government",
    "politics": "politics-government",
    "science": "science-research",
    "entertainment": "entertainment-culture",
    "ai": "artificial-intelligence",
    "world": "world-news",
    "india": "india-news",
    "health": "healthcare",
    "climate": "climate-environment",
    "auto": "automotive-mobility",
    # canonical IDs and labels keep reclassification stable between startups
    "business-economy": "business-economy",
    "business & economy": "business-economy",
    "markets-investing": "markets-investing",
    "markets & investing": "markets-investing",
    "technology": "technology",
    "artificial-intelligence": "artificial-intelligence",
    "artificial intelligence": "artificial-intelligence",
    "startups-vc": "startups-vc",
    "startups & venture capital": "startups-vc",
    "science-research": "science-research",
    "science & research": "science-research",
    "cybersecurity": "cybersecurity",
    "politics-government": "politics-government",
    "politics & government": "politics-government",
    "world-news": "world-news",
    "world news": "world-news",
    "india-news": "india-news",
    "india news": "india-news",
    "climate-environment": "climate-environment",
    "climate & environment": "climate-environment",
    "energy": "energy",
    "healthcare": "healthcare",
    "education": "education",
    "sports": "sports",
    "entertainment-culture": "entertainment-culture",
    "entertainment & culture": "entertainment-culture",
    "gaming": "gaming",
    "automotive-mobility": "automotive-mobility",
    "automotive & mobility": "automotive-mobility",
}

VALID_IDS = frozenset(CATEGORY_BY_ID)


def _keyword_pattern(keyword: str) -> re.Pattern[str]:
    """Word-boundary match that also handles phrases and punctuation."""
    escaped = re.escape(keyword.strip().lower())
    escaped = escaped.replace(r"\ ", r"\s+")
    return re.compile(rf"(?<![a-z0-9]){escaped}(?![a-z0-9])", re.IGNORECASE)


_KEYWORD_PATTERNS: Tuple[Tuple[str, Tuple[Tuple[str, re.Pattern[str]], ...]], ...] = tuple(
    (
        category.id,
        tuple((keyword, _keyword_pattern(keyword)) for keyword in category.keywords),
    )
    for category in CATEGORIES
)


def clean_text(*parts: Optional[str]) -> str:
    text = " ".join(part for part in parts if part)
    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip().lower()


def legacy_category(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    return LEGACY_ALIASES.get(str(value).strip().lower())


def classify(
    headline: Optional[str],
    summary: Optional[str] = None,
    legacy: Optional[str] = None,
) -> List[Tuple[str, str]]:
    """Return ``[(category_id, source)]`` ordered by the canonical taxonomy.

    ``legacy`` is the article's existing category label. It is always kept
    when it maps to a canonical category, so classification can add labels
    but never erase the source's own signal.
    """
    text = clean_text(headline, summary)
    legacy_id = legacy_category(legacy)

    matched = set()
    for category_id, patterns in _KEYWORD_PATTERNS:
        for _keyword, pattern in patterns:
            if pattern.search(text):
                matched.add(category_id)
                break

    results: List[Tuple[str, str]] = []
    for category in CATEGORIES:
        cid = category.id
        has_legacy = cid == legacy_id
        has_keyword = cid in matched
        if has_legacy and has_keyword:
            results.append((cid, SOURCE_BOTH))
        elif has_legacy:
            results.append((cid, SOURCE_LEGACY))
        elif has_keyword:
            results.append((cid, SOURCE_KEYWORD))
    return results


def primary_category_id(
    classifications: Sequence[Tuple[str, str]],
    legacy: Optional[str] = None,
) -> Optional[str]:
    """Pick the category used for the article's single ``category`` label.

    Preference order: the legacy-mapped category, then the highest-priority
    keyword match. This keeps a Markets story titled "... AI ..." labelled
    Markets rather than Artificial Intelligence.
    """
    legacy_id = legacy_category(legacy)
    if legacy_id:
        return legacy_id
    if classifications:
        return classifications[0][0]
    return None


def label_for(category_id: Optional[str]) -> Optional[str]:
    if not category_id:
        return None
    category = CATEGORY_BY_ID.get(category_id)
    return category.label if category else None


def normalize_ids(values: Optional[Iterable[str]], strict: bool = True) -> List[str]:
    """Normalize aliases/labels to canonical IDs, rejecting unknown values.

    With ``strict=False`` unknown stored values are ignored instead of raising,
    which keeps old profiles usable after a taxonomy change.

    Returns IDs in canonical order without duplicates.
    """
    if not values:
        return []
    resolved = set()
    unknown = []
    for value in values:
        if value is None:
            continue
        raw = str(value).strip()
        if not raw:
            continue
        if raw in VALID_IDS:
            resolved.add(raw)
            continue
        alias = LEGACY_ALIASES.get(raw.lower())
        if alias:
            resolved.add(alias)
        else:
            unknown.append(raw)
    if unknown and strict:
        raise ValueError(unknown)
    return sorted(resolved, key=lambda cid: CATEGORY_ORDER[cid])


def category_infos(counts: Optional[dict] = None) -> List[dict]:
    counts = counts or {}
    return [
        {
            "id": category.id,
            "label": category.label,
            "article_count": int(counts.get(category.id, 0)),
        }
        for category in CATEGORIES
    ]
