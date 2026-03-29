from enricher import enrich_article

def run_enrichment(articles: List[dict]) -> List[dict]:
    from typing import List
    return [enrich_article(a) for a in articles]
