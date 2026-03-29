from typing import List

SENTIMENT_BOOST = {"positive": 0.3, "negative": -0.1, "neutral": 0.0}

def run_ranking(articles: List[dict], user_profile: dict) -> List[dict]:
    category_weights = user_profile.get("category_weights", {})
    topic_preferences = user_profile.get("topic_preferences", [])
    
    def score(article: dict) -> float:
        base = 1.0
        category = article.get("category", "General")
        cat_weight = category_weights.get(category, 0.0)
        
        topic_boost = 0.0
        if topic_preferences:
            article_text = (
                article.get("headline", "") + " " + 
                article.get("summary", "")
            ).lower()
            matches = sum(
                1 for topic in topic_preferences 
                if topic.lower() in article_text
            )
            topic_boost = matches * 0.4
        
        sentiment = article.get("sentiment_label", "neutral")
        sentiment_boost = SENTIMENT_BOOST.get(sentiment, 0.0)
        
        entity_boost = 0.0
        interested_entities = user_profile.get("entity_interests", [])
        article_entities = article.get("entities", [])
        if interested_entities and article_entities:
            matches = sum(
                1 for e in article_entities 
                if e in interested_entities
            )
            entity_boost = matches * 0.3
        
        return base + cat_weight + topic_boost + sentiment_boost + entity_boost
    
    scored = [(score(a), a) for a in articles]
    scored.sort(key=lambda x: x[0], reverse=True)
    
    result = []
    for s, a in scored:
        a["relevance_score"] = round(s, 3)
        a["is_personalised"] = s > 1.3
        result.append(a)
    return result
