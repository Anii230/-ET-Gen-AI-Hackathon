from typing import List, Tuple
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def run_synthesis(
    articles: List[dict], 
    query: str = ""
) -> Tuple[str, List[str]]:
    try:
        if not articles:
            return "No articles available for briefing.", []
        
        # Ensure query is a string
        safe_query = query or ""
        
        top_articles = articles[:8]
        
        articles_text = ""
        sources = []
        for i, a in enumerate(top_articles, 1):
            articles_text += f"""
Article {i}:
Headline: {a.get('headline', '')}
Source: {a.get('source', '')}
Summary: {a.get('summary', '')}
Sentiment: {a.get('sentiment_label', 'neutral')}
Category: {a.get('category', '')}
---"""
            sources.append(a.get('id', ''))
        
        if "TOPIC_WISE_SUMMARY" in safe_query:
            user_prompt = f"""You are an expert news curator. Create a topic-wise briefing from these articles. 
Group them by their Category and provide a 2-3 sentence insightful summary for EACH category. 
Ensure you clearly separate the categories with a heading like '### CATEGORY_NAME'.

{articles_text}

Format the response by topic/category:
- Category 1: Summary...
- Category 2: Summary...

Do not combine different topics. Citations (e.g. NDTV Profit, Reuters) are mandatory.
"""
        elif safe_query:
            user_prompt = f"""You are an expert Indian financial and business news analyst. 
Be precise, insightful, and always cite sources by name. 
When asked to explain a specific article, focus on that article 
but add context from related articles. Never say you cannot 
generate a briefing — always provide the best analysis possible 
with available information.

Analyze this: "{safe_query}"

{articles_text}
"""
        else:
            user_prompt = f"""Create an intelligent news briefing from these articles:

{articles_text}

Structure your briefing as:
1. TOP STORY: The most significant development and why it matters
2. KEY THEMES: 2-3 recurring themes across stories  
3. MARKET SIGNAL: Overall sentiment and what to watch
4. WHAT'S NEXT: One prediction or thing to monitor

Keep it under 250 words. Be specific, not generic.
"""
        
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert Indian financial and business news analyst. Be precise, insightful, and always cite sources by name. When asked to explain a specific article, focus on that article but add context from related articles. Never say you cannot generate a briefing — always provide the best analysis possible with available information."
                },
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.6,
            max_tokens=400,
        )
        return completion.choices[0].message.content, sources
    except Exception as e:
        import traceback
        print(f"Synthesis Error: {traceback.format_exc()}")
        return f"Based on available information: {str(e)[:100]}", []
