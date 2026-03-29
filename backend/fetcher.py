import feedparser
import requests
import hashlib
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

RSS_FEEDS = [
    {
        "url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
        "source": "Economic Times",
        "category": "Markets"
    },
    {
        "url": "https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms",
        "source": "Economic Times", 
        "category": "Tech"
    },
    {
        "url": "https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms",
        "source": "Economic Times",
        "category": "Economy"
    },
    {
        "url": "https://economictimes.indiatimes.com/small-biz/startups/rssfeeds/15285060.cms",
        "source": "Economic Times",
        "category": "Startups"
    },
    {
        "url": "https://www.livemint.com/rss/economy",
        "source": "Mint",
        "category": "Economy"
    },
    {
        "url": "https://www.livemint.com/rss/technology",
        "source": "Mint",
        "category": "Tech"
    },
    {
        "url": "https://www.livemint.com/rss/markets",
        "source": "Mint",
        "category": "Markets"
    },
    {
        "url": "https://inc42.com/feed/",
        "source": "Inc42",
        "category": "Startups"
    },
    {
        "url": "https://feeds.feedburner.com/ndtvprofit-latest",
        "source": "NDTV Profit",
        "category": "Markets"
    },
]

def estimate_read_time(text: str) -> int:
    words = len(text.split()) if text else 0
    return max(1, round(words / 200))

def fetch_rss_articles() -> list:
    articles = []
    for feed_config in RSS_FEEDS:
        try:
            feed = feedparser.parse(feed_config["url"])
            for entry in feed.entries[:8]:
                article_id = hashlib.md5(
                    entry.get("link", "").encode()
                ).hexdigest()
                published = None
                if hasattr(entry, "published_parsed") and entry.published_parsed:
                    published = datetime(*entry.published_parsed[:6])
                summary = entry.get("summary", "") or entry.get("description", "")
                if len(summary) > 500:
                    summary = summary[:500] + "..."
                    
                image_url = None

                # Try enclosure tag (standard RSS)
                if hasattr(entry, 'enclosures') and entry.enclosures:
                    for enc in entry.enclosures:
                        if enc.get('type', '').startswith('image/'):
                            image_url = enc.get('href') or enc.get('url')
                            break
                
                # Try media:content tag
                if not image_url and hasattr(entry, 'media_content'):
                    for media in entry.media_content:
                        if media.get('medium') == 'image' or \
                           media.get('type', '').startswith('image/'):
                            image_url = media.get('url')
                            break
                
                # Try media:thumbnail
                if not image_url and hasattr(entry, 'media_thumbnail'):
                    if entry.media_thumbnail:
                        image_url = entry.media_thumbnail[0].get('url')

                articles.append({
                    "id": article_id,
                    "headline": entry.get("title", ""),
                    "summary": summary,
                    "content": summary,
                    "source": feed_config["source"],
                    "category": feed_config["category"],
                    "url": entry.get("link", ""),
                    "image_url": image_url,
                    "published_at": published,
                    "read_time": estimate_read_time(summary),
                    "sentiment_score": 0.0,
                    "sentiment_label": "neutral",
                    "entities": [],
                    "enriched": False,
                })
        except Exception as e:
            print(f"RSS fetch error for {feed_config['url']}: {e}")
            continue
    return articles

def fetch_newsapi_articles() -> list:
    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        return []
    try:
        resp = requests.get(
            "https://newsapi.org/v2/top-headlines",
            params={
                "country": "in",
                "category": "business",
                "pageSize": 20,
                "apiKey": api_key,
            },
            timeout=10,
        )
        data = resp.json()
        articles = []
        for item in data.get("articles", []):
            if not item.get("title"):
                continue
            article_id = hashlib.md5(
                item.get("url", "").encode()
            ).hexdigest()
            published = None
            if item.get("publishedAt"):
                try:
                    published = datetime.fromisoformat(
                        item["publishedAt"].replace("Z", "+00:00")
                    )
                except Exception:
                    pass
            summary = item.get("description") or item.get("content") or ""
            articles.append({
                "id": article_id,
                "headline": item["title"],
                "summary": summary[:500] if summary else "",
                "content": summary,
                "source": item.get("source", {}).get("name", "Unknown"),
                "category": "Business",
                "url": item.get("url", ""),
                "image_url": item.get("urlToImage"),
                "published_at": published,
                "read_time": estimate_read_time(summary),
                "sentiment_score": 0.0,
                "sentiment_label": "neutral",
                "entities": [],
                "enriched": False,
            })
        return articles
    except Exception as e:
        print(f"NewsAPI error: {e}")
        return []

def search_external_articles(query: str, limit: int = 10) -> list:
    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        return []
    try:
        resp = requests.get(
            "https://newsapi.org/v2/everything",
            params={
                "q": query,
                "language": "en",
                "sortBy": "relevancy",
                "pageSize": limit,
                "apiKey": api_key,
            },
            timeout=10,
        )
        data = resp.json()
        articles = []
        for item in data.get("articles", []):
            if not item.get("title"):
                continue
            article_id = hashlib.md5(
                item.get("url", "").encode()
            ).hexdigest()
            published = None
            if item.get("publishedAt"):
                try:
                    published = datetime.fromisoformat(
                        item["publishedAt"].replace("Z", "+00:00")
                    )
                except Exception:
                    pass
            summary = item.get("description") or item.get("content") or ""
            articles.append({
                "id": article_id,
                "headline": item["title"],
                "summary": summary[:500] if summary else "",
                "content": summary,
                "source": item.get("source", {}).get("name", "Web Intelligence"),
                "category": "Global Search",
                "url": item.get("url", ""),
                "image_url": item.get("urlToImage"),
                "published_at": published,
                "read_time": estimate_read_time(summary),
                "sentiment_score": 0.0,
                "sentiment_label": "neutral",
                "entities": [],
                "enriched": False,
              })
        return articles
    except Exception as e:
        print(f"External search error: {e}")
        return []
