"""Briefing synthesis with bounded truncation recovery.

Article briefings promise a fixed structure. If the provider stops at the
output-token ceiling, one shorter regeneration is attempted. A second failure
returns the partial draft explicitly marked incomplete; missing sections are
never invented.
"""

from dataclasses import dataclass, field
from typing import List, Optional

from llm import LLMServiceError, chat_completion_result

# gpt-oss reasons internally before it writes, so the visible answer needs a
# comfortable ceiling. Reasoning effort stays "low" via the shared client.
ARTICLE_BUDGET = 1400
ARTICLE_RETRY_BUDGET = 700
TOPIC_BUDGET = 1000
TOPIC_RETRY_BUDGET = 600
QUERY_BUDGET = 900
QUERY_RETRY_BUDGET = 550
SUMMARY_CHARS = 1200
CONTENT_CHARS = 3000

SYSTEM_PROMPT = (
    "You are an expert Indian financial and business news analyst. "
    "Be precise, insightful, and always cite sources by name. "
    "When asked to explain a specific article, focus on that article but add "
    "context from related articles. Never invent facts, figures or sections "
    "that the supplied reporting does not support. Always finish with a "
    "complete sentence."
)


@dataclass
class SynthesisOutcome:
    briefing: str
    sources: List[str] = field(default_factory=list)
    complete: bool = True
    truncated: bool = False
    recovered: bool = False
    finish_reason: Optional[str] = None


def _clean(value: object, limit: int) -> str:
    """Collapse whitespace and bound one field before it enters the prompt."""
    text = " ".join(str(value or "").split())
    if len(text) <= limit:
        return text
    clipped = text[:limit]
    # Avoid ending on half a word.
    if " " in clipped:
        clipped = clipped.rsplit(" ", 1)[0]
    return clipped + "…"


def _articles_block(articles: List[dict]) -> str:
    lines: List[str] = []
    for index, article in enumerate(articles, 1):
        summary = _clean(article.get("summary"), SUMMARY_CHARS)
        content = _clean(article.get("content"), CONTENT_CHARS)
        # Many feeds store the same text in both fields. Only send the longer
        # extract when it actually adds reporting the summary does not have.
        if content and len(content) <= len(summary) + 40:
            content = ""
        lines.append(
            "\n".join(
                [
                    f"Article {index}:",
                    f"Headline: {_clean(article.get('headline'), 300)}",
                    f"Source: {_clean(article.get('source'), 120)}",
                    f"Category: {_clean(article.get('category'), 80)}",
                    f"Sentiment: {_clean(article.get('sentiment_label'), 40) or 'neutral'}",
                    f"Summary: {summary or 'No summary available.'}",
                    *([f"Extract: {content}"] if content else []),
                    "---",
                ]
            )
        )
    return "\n".join(lines)


def _prompt_for(
    articles: List[dict],
    query: str,
    focus_headline: Optional[str] = None,
) -> tuple[str, int, int]:
    articles_text = _articles_block(articles)

    if "TOPIC_WISE_SUMMARY" in query:
        prompt = f"""You are an expert news curator. Create a topic-wise briefing from these articles.
Group them by their Category. For EACH category write a heading in the form
'### CATEGORY_NAME' followed by 2-3 insightful sentences.

{articles_text}

Rules:
- Cover only categories present in the articles above.
- Do not add an introduction or conclusion.
- Cite the publication by name in each section.
- Stop after the final category."""
        return prompt, TOPIC_BUDGET, TOPIC_RETRY_BUDGET

    if query:
        prompt = f"""You are an expert Indian financial and business news analyst.
Analyse this request: "{query}"

Use the reporting below as context. Answer in 3-5 short paragraphs (under 180
words), cite sources by name, and do not invent data.

{articles_text}"""
        return prompt, QUERY_BUDGET, QUERY_RETRY_BUDGET

    prompt = f"""Create an intelligent news briefing from these articles.

{articles_text}

Use exactly this structure, with these headings:

### Top Story
2-3 sentences on the most significant development and why it matters.

### Key Themes
2-3 short bullets on recurring threads across the stories.

### Market Signal or Overall Impact
2-3 sentences on sentiment and practical impact. If the story has no market
angle, say so in one sentence instead of inventing one.

### What's Next
1-2 sentences on the next thing to monitor.

Keep the whole briefing under 220 words. Do not add any other sections. Do not
repeat the headline. Finish the final sentence."""

    if focus_headline:
        prompt = f"""Write a briefing on one specific story, using the other
articles only as context. The focus story is: "{focus_headline}"

{articles_text}

Use exactly this structure, with these headings:

### Top Story
2-3 sentences on the focus story and why it matters for the reader.

### Key Themes
2-3 short bullets on the wider threads this story belongs to, citing related
coverage where it genuinely adds context.

### Market Signal or Overall Impact
2-3 sentences on sentiment and practical impact. If the focus story has no
market angle, say so in one sentence instead of inventing one.

### What's Next
1-2 sentences on what to watch next in this story.

Keep the whole briefing under 220 words. The Top Story must be about the focus
story, not a related article. Do not add other sections or repeat the headline.
Finish the final sentence."""

    return prompt, ARTICLE_BUDGET, ARTICLE_RETRY_BUDGET


def _recovery_prompt(prompt: str) -> str:
    return (
        prompt
        + "\n\nYour previous draft hit the output limit before it finished. "
        "Rewrite the COMPLETE briefing from the start in at most 120 words. "
        "Keep only sections supported by the reporting and end with a full sentence."
    )


def _request(prompt: str, max_tokens: int):
    return chat_completion_result(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.6,
        max_tokens=max_tokens,
    )


def run_synthesis(
    articles: List[dict],
    query: str = "",
    focus_article_id: Optional[str] = None,
) -> SynthesisOutcome:
    if not articles:
        return SynthesisOutcome(
            briefing="No articles available for briefing.",
            sources=[],
            complete=True,
            finish_reason="stop",
        )

    ordered = list(articles)
    focus_headline = None
    if focus_article_id:
        focused = [a for a in ordered if a.get("id") == focus_article_id]
        if focused:
            # Ranking may have moved the requested story down; the reader
            # opened this page for that story, so it leads the prompt.
            ordered = focused + [a for a in ordered if a.get("id") != focus_article_id]
            focus_headline = focused[0].get("headline") or None

    top_articles = ordered[:8]
    sources = [article.get("id", "") for article in top_articles]
    prompt, budget, retry_budget = _prompt_for(top_articles, query, focus_headline)

    # Raises LLMServiceError on provider/configuration failure; the graph turns
    # that into the existing user-safe degraded state.
    first = _request(prompt, budget)

    if not first.truncated:
        complete = first.finish_reason in (None, "stop")
        return SynthesisOutcome(
            briefing=first.content,
            sources=sources,
            complete=complete,
            truncated=False,
            finish_reason=first.finish_reason,
        )

    # One bounded regeneration with a shorter format. Regenerating (rather
    # than continuing) avoids duplicated paragraphs when the model restarts.
    try:
        second = _request(_recovery_prompt(prompt), retry_budget)
    except LLMServiceError:
        # The first draft is real output; keep it and disclose that it is short
        # rather than replacing it with the generic degraded message.
        return SynthesisOutcome(
            briefing=first.content,
            sources=sources,
            complete=False,
            truncated=True,
            finish_reason=first.finish_reason,
        )

    if not second.truncated:
        complete = second.finish_reason in (None, "stop")
        return SynthesisOutcome(
            briefing=second.content,
            sources=sources,
            complete=complete,
            truncated=False,
            recovered=True,
            finish_reason=second.finish_reason,
        )

    return SynthesisOutcome(
        briefing=second.content,
        sources=sources,
        complete=False,
        truncated=True,
        recovered=False,
        finish_reason=second.finish_reason,
    )
