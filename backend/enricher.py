import spacy
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

nlp = spacy.load("en_core_web_sm")
analyzer = SentimentIntensityAnalyzer()

CATEGORY_KEYWORDS = {
    "Markets": [
        "sensex", "nifty", "bse", "nse", "stock market", 
        "equity", "shares", "dalal street", "bull", "bear",
        "ipo", "fii", "dii", "futures", "options", "trading",
        "sebi", "mutual fund", "portfolio", "dividend"
    ],
    "Economy": [
        "gdp", "inflation", "rbi", "repo rate", "fiscal deficit",
        "budget", "rupee", "forex", "trade deficit", "imf",
        "world bank", "monetary policy", "cpi", "wpi",
        "economic growth", "recession", "unemployment"
    ],
    "Tech": [
        "artificial intelligence", "machine learning", "startup",
        "software", "app", "smartphone", "5g", "6g", "cloud",
        "cybersecurity", "data", "algorithm", "silicon",
        "semiconductor", "electric vehicle", "ev", "tesla",
        "google", "microsoft", "apple", "meta", "openai"
    ],
    "Startups": [
        "funding", "venture capital", "series a", "series b",
        "series c", "unicorn", "seed round", "angel investor",
        "valuation", "vc", "inc42", "founder", "entrepreneur",
        "pivot", "accelerator", "incubator", "startup india"
    ],
    "Policy": [
        "supreme court", "high court", "government policy",
        "ministry", "regulation", "parliament", "bill passed",
        "legislation", "amendment", "tribunal", "rbi regulation",
        "sebi circular", "compliance", "penalty", "fine"
    ],
    "Science": [
        "isro", "nasa", "space mission", "satellite", "rocket",
        "research", "discovery", "study published", "scientist",
        "laboratory", "genome", "vaccine", "clinical trial",
        "gaganyaan", "chandrayaan", "mars", "asteroid"
    ],
    "Sports": [
        "ipl", "cricket", "rcb", "csk", "mi ", "kkr", "srh",
        "dc ", "pbks", "gt ", "lsg", "bcci", "fifa", "football",
        "tennis", "badminton", "hockey", "olympics", "cwg",
        "virat kohli", "rohit sharma", "ms dhoni", "match",
        "wicket", "century", "tournament", "championship", "league"
    ],
    "Entertainment": [
        "trailer", "movie", "film", "series", "web series",
        "netflix", "amazon prime", "disney", "hotstar", "ott",
        "bollywood", "box office", "actor", "actress", "director",
        "streaming", "episode", "season", "award", "oscar",
        "grammy", "celebrity", "song", "album", "music"
    ],
}

def detect_category(text: str, default: str = "General") -> str:
    text_lower = text.lower()
    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[category] = score
    if not scores:
        return default
    return max(scores, key=scores.get)

def enrich_article(article: dict) -> dict:
    text = f"{article.get('headline', '')} {article.get('summary', '')}"
    
    # NER
    doc = nlp(text[:1000])
    entities = list(set([
        ent.text for ent in doc.ents 
        if ent.label_ in ["ORG", "PERSON", "GPE", "PRODUCT"]
    ]))
    
    # Sentiment
    scores = analyzer.polarity_scores(text)
    compound = scores["compound"]
    if compound >= 0.05:
        label = "positive"
    elif compound <= -0.05:
        label = "negative"
    else:
        label = "neutral"
    
    # Category detection
    category = detect_category(
        text, 
        default=article.get("category", "General")
    )
    
    article["entities"] = entities[:10]
    article["sentiment_score"] = compound
    article["sentiment_label"] = label
    article["category"] = category
    article["enriched"] = True
    return article
