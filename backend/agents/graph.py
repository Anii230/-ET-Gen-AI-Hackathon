from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, END
from agents.enrichment_agent import run_enrichment
from agents.ranking_agent import run_ranking
from agents.synthesis_agent import run_synthesis

class NewsState(TypedDict):
    articles: List[dict]
    user_profile: dict
    query: Optional[str]
    enriched_articles: List[dict]
    ranked_articles: List[dict]
    briefing: Optional[str]
    sources_used: List[str]
    error: Optional[str]

def enrichment_node(state: NewsState) -> NewsState:
    try:
        enriched = run_enrichment(state["articles"])
        return {**state, "enriched_articles": enriched}
    except Exception as e:
        return {**state, "error": str(e), "enriched_articles": state["articles"]}

def ranking_node(state: NewsState) -> NewsState:
    try:
        ranked = run_ranking(
            state["enriched_articles"],
            state["user_profile"]
        )
        return {**state, "ranked_articles": ranked}
    except Exception as e:
        return {**state, "error": str(e), "ranked_articles": state["enriched_articles"]}

def synthesis_node(state: NewsState) -> NewsState:
    try:
        briefing, sources = run_synthesis(
            state["ranked_articles"],
            state.get("query", "")
        )
        return {**state, "briefing": briefing, "sources_used": sources}
    except Exception as e:
        return {
            **state, 
            "error": str(e), 
            "briefing": f"Briefing temporarily unavailable. The pipeline processed {len(state.get('ranked_articles', []))} articles.", 
            "sources_used": []
        }

def build_pipeline() -> StateGraph:
    graph = StateGraph(NewsState)
    graph.add_node("enrichment", enrichment_node)
    graph.add_node("ranking", ranking_node)
    graph.add_node("synthesis", synthesis_node)
    graph.set_entry_point("enrichment")
    graph.add_edge("enrichment", "ranking")
    graph.add_edge("ranking", "synthesis")
    graph.add_edge("synthesis", END)
    return graph.compile()

pipeline = build_pipeline()
