from typing import TypedDict, List, Optional
import logging
from langgraph.graph import StateGraph, END
from agents.enrichment_agent import run_enrichment
from agents.ranking_agent import run_ranking
from agents.synthesis_agent import run_synthesis
from llm import LLMServiceError

logger = logging.getLogger("et_news.pipeline")

FALLBACK_BRIEFING = (
    "AI briefing is temporarily unavailable right now. "
    "Your ranked articles are still shown below — please try again in a few minutes."
)

class NewsState(TypedDict):
    articles: List[dict]
    user_profile: dict
    query: Optional[str]
    enriched_articles: List[dict]
    ranked_articles: List[dict]
    briefing: Optional[str]
    sources_used: List[str]
    error: Optional[str]
    briefing_error: Optional[str]
    briefing_complete: bool
    briefing_truncated: bool
    briefing_recovered: bool
    focus_article_id: Optional[str]


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
        outcome = run_synthesis(
            state["ranked_articles"],
            state.get("query", ""),
            state.get("focus_article_id"),
        )
        return {
            **state,
            "briefing": outcome.briefing,
            "sources_used": outcome.sources,
            "briefing_error": None,
            "briefing_complete": outcome.complete,
            "briefing_truncated": outcome.truncated,
            "briefing_recovered": outcome.recovered,
        }
    except LLMServiceError as exc:
        # User-facing text stays generic; the real cause is logged by llm.py.
        logger.warning("Briefing synthesis degraded: code=%s", exc.code)
        return {
            **state,
            "briefing": FALLBACK_BRIEFING,
            "sources_used": [],
            "briefing_error": exc.code,
            "briefing_complete": False,
            "briefing_truncated": False,
            "briefing_recovered": False,
        }
    except Exception:
        logger.exception("Briefing synthesis failed unexpectedly")
        return {
            **state,
            "briefing": FALLBACK_BRIEFING,
            "sources_used": [],
            "briefing_error": "llm_error",
            "briefing_complete": False,
            "briefing_truncated": False,
            "briefing_recovered": False,
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
