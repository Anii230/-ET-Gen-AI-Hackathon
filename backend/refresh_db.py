import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from fetcher import fetch_rss_articles, fetch_newsapi_articles
from routers.feed import upsert_articles
from models import Article

db = SessionLocal()
print('Fetching RSS...')
raw = fetch_rss_articles()
# Adding safety check for raw content
if raw is None:
    raw = []
print(f'RSS returned: {len(raw)} articles')
try:
    news_api_articles = fetch_newsapi_articles()
    if news_api_articles:
        raw += news_api_articles
    print(f'Total with NewsAPI: {len(raw)} articles')
except Exception as e:
    print(f"NewsAPI fetch failed (likely API key issue): {e}")

upsert_articles(raw, db)
count = db.query(Article).count()
print(f'Total in DB now: {count}')
db.close()
print('Done.')
