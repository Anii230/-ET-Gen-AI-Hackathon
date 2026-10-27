NEXUS — Architecture and NLP Implementation Audit
Scope: read-only inspection of the current working tree. No files were created, modified, or deleted.
Evidence standard used below:
- Confirmed — directly visible in source, configuration keys, schema, or a read-only query of the local SQLite database.
- Inferred — follows from the code path but was not exercised live during this audit.
- Unknown — cannot be established without runtime measurement, labelled data, or a user study.
Important framing: NEXUS is best described as a hybrid news-intelligence application that combines a small local NLP layer (spaCy NER and VADER sentiment), deterministic keyword taxonomy rules, SQL filtering/pagination, and hosted LLM generation through Groq. It is not training its own model, not doing retrieval-augmented generation, and not performing misinformation, bias, factuality, or prediction analysis.
1. Executive Summary
What the system actually is today
Layer	Current implementation
Frontend	Next.js 16.2.1 App Router, React 19.2.4, TypeScript, Tailwind, Zustand, Framer Motion, React Markdown, Supabase browser auth
Backend	FastAPI, SQLAlchemy, SQLite, feedparser, spaCy en_core_web_sm, VADER, LangGraph, direct Groq SDK
News sources	12 hard-coded RSS feed URLs from 5 publishers, optional NewsAPI fallback and NewsAPI topic search
Local NLP	spaCy NER (ORG, PERSON, GPE, PRODUCT), VADER compound sentiment, rule-based 18-category keyword classifier
LLM use	Article briefings, topic briefings, Navigator topic-wise synthesis, Story Arc descriptions, article/topic chat
Persistence	SQLite: articles, category mappings, user profiles, attention signals, bookmarks (bookmarks unused by backend)
Personalisation	Strict category filter on the “For You” feed; no learned ranking on the feed itself
Evaluation	No accuracy evaluation, no gold labels, no user study, no factuality or bias measurement
The five claims you can defend
1. There is genuine conventional NLP in the system. spaCy performs statistical named-entity recognition, and VADER performs lexicon/rule-based sentiment scoring on the headline plus summary. These are executed during ingestion in backend/enricher.py.
2. There is a real multi-label taxonomy layer. backend/taxonomy.py defines 18 canonical categories with explicit keyword patterns, legacy-label aliases, provenance tracking, and deterministic multi-label assignment.
3. There is a real LLM synthesis layer. backend/agents/synthesis_agent.py and backend/agents/briefing_router.py construct bounded prompts from multiple articles, call Groq, and handle output truncation with one recovery attempt.
4. There is real retrieval logic. The feed uses SQL keyset pagination, category filtering, multi-category union, and stable ordering; topic briefings use keyword matching over recent articles; Story Arcs use entity co-occurrence.
5. The engineering is substantial. The backend has route-level error handling, typed LLM errors, CORS handling, cursor validation, category provenance, startup backfill, frontend error/loading/empty states, abortable requests, and 85 backend plus 25 frontend tests.
The five claims you must qualify
1. “AI agents rank and personalise the feed” is not what the current feed does. The General feed is chronological, and “For You” is a category filter followed by chronological ordering. The ranking agent exists, but it is only used inside the briefing pipeline.
2. “Attention tracking learns from reading behaviour” is not wired to the frontend. recordAttention exists in frontend/lib/api.ts but is never called. The attention_signals table had zero rows at audit time.
3. “The system understands the full article” is not true. RSS ingestion stores the feed summary as both summary and content, truncated to 500 characters; the backend never extracts article body text. Article chat and briefings therefore work from headline plus lede, not full reporting.
4. “Story Arcs track evolving stories over time” overstates the implementation. Arcs are recomputed per request by grouping the latest 60 articles on exact shared entity strings. They are not persisted, not entity-resolved, and the timeline uses the earliest six articles in ascending order.
5. “The LLM is grounded and factual” is a prompt instruction, not a verified property. There is no retrieval, citation verification, factuality scoring, or hallucination detection.
Lifecycle scorecard
Stage	Status	Key evidence
RSS/NewsAPI discovery	Implemented	backend/fetcher.py:10-71, :77-200
Fetching/parsing	Implemented	fetch_rss_articles, feedparser.parse
Normalisation	Partial	Field mapping and 500-char truncation; no body extraction or HTML normalisation at ingestion
Deduplication	Partial	Exact MD5 of URL only; existing rows skipped
Category assignment	Implemented, rule-based	backend/taxonomy.py, backend/categorization.py
NER	Implemented, local	backend/enricher.py:6, :80-110
Sentiment	Implemented, local	backend/enricher.py:7, :90-110
Storage	Implemented	backend/models.py, SQLite
General feed retrieval	Implemented, chronological	backend/routers/feed.py:271-281
Personalised feed ranking	Partial / mislabelled	Strict category filter, chronological order
Article detail	Implemented, summary only	backend/routers/articles.py:10-35
AI briefing	Implemented, LLM	backend/agents/graph.py, synthesis_agent.py, briefing_router.py
Story Arcs	Partial	Entity co-occurrence plus LLM blurb, no persistence
Article chat	Partial	Fixed context, no history, no RAG, empty sources
Frontend rendering	Implemented	Next.js pages and components
2. Repository and Technology Stack
High-level structure
.
├── backend/
│   ├── main.py                  FastAPI app, middleware, lifespan, routers
│   ├── config.py                environment loading, model/CORS config
│   ├── database.py              SQLAlchemy engine/session/Base
│   ├── models.py                Article, ArticleCategory, UserProfile,
│   │                            AttentionSignal, Bookmark
│   ├── schemas.py               Pydantic response/request models
│   ├── fetcher.py               RSS + NewsAPI discovery and normalisation
│   ├── enricher.py              spaCy NER, VADER sentiment, legacy keyword categories
│   ├── taxonomy.py              18-category canonical taxonomy and rules
│   ├── categorization.py        category persistence, sync, backfill, counts
│   ├── llm.py                   shared Groq client, error mapping, token metadata
│   ├── agents/
│   │   ├── graph.py             LangGraph Enrichment → Ranking → Synthesis
│   │   ├── enrichment_agent.py  wrapper around enrich_article
│   │   ├── ranking_agent.py     briefing-only scoring formula
│   │   ├── synthesis_agent.py   briefing prompts and truncation recovery
│   │   └── briefing_router.py   /briefing and /briefing/topic endpoints
│   ├── routers/
│   │   ├── feed.py              ingestion, general/personalised feed, categories
│   │   ├── articles.py          article detail
│   │   ├── chat.py              article/global chat
│   │   ├── attention.py         attention signal ingestion (unused by frontend)
│   │   ├── users.py             saved category preferences
│   │   └── story_arc.py         entity-grouped Story Arcs
│   ├── tests/                   unittest suites
│   └── et_news.db               local SQLite database
├── frontend/
│   ├── app/                     Next.js App Router pages
│   ├── components/              layout, feed, article, chat, marketing, UI
│   ├── lib/
│   │   ├── api.ts               typed backend client
│   │   ├── hooks/useFeed.ts     cursor feed loading and abort handling
│   │   ├── feed-reducer.ts      per-tab feed state machine
│   │   ├── store/               Zustand stores
│   │   ├── bookmarks.ts         localStorage bookmarks
│   │   ├── supabase/            browser/server Supabase clients
│   │   └── mock-data.ts         marketing mock content
│   ├── proxy.ts                 Supabase session refresh (Next 16 proxy)
│   └── tests/                   Vitest tests
└── README.md
Technology facts confirmed from manifests
- Frontend: next@16.2.1, not Next.js 14 as the README says. react@19.2.4, TypeScript, Tailwind CSS 4, Zustand, Framer Motion, GSAP, React Markdown, @supabase/ssr, @supabase/supabase-js.
- @tanstack/react-query is installed in frontend/package.json but there is no import or QueryClient usage anywhere in app/, components/, or lib/. Data fetching is manual fetch plus React state.
- Backend: FastAPI, SQLAlchemy, Pydantic, feedparser, requests, spaCy, vaderSentiment, LangGraph, and the direct groq SDK.
- langchain-groq, chromadb, sentence-transformers, transformers, torch, scikit-learn, scipy, and numpy appear in backend/requirements.txt, but there are no application imports for them. They are installed footprint, not active functionality.
- The README says “9 sources”; backend/fetcher.py:10-71 actually defines 12 RSS URLs from five publishers (Economic Times, Mint, Inc42, NDTV Profit; the current database also contains NewsAPI-sourced The Verge, Wired, BBC, and Gizmodo articles).
Entry points
Application	Entry point	Start command
Backend	backend/main.py:80 creates app = FastAPI(...); uvicorn main:app --reload --port 8000 from backend/	Uvicorn
Frontend	frontend/app/layout.tsx root layout; frontend/app/(marketing)/page.tsx landing page; (app) route group shell	npm run dev from frontend/
Manual ingestion	backend/refresh_db.py	python refresh_db.py from backend/
Frontend–backend communication
- frontend/lib/api.ts:1 sets the base URL from NEXT_PUBLIC_API_URL, defaulting to http://localhost:8000.
- All requests go through request<T> (api.ts:20-57), which handles non-2xx JSON detail/code, network failures, and abort errors.
- Article, FeedPage, CategoryInfo, Profile, BriefingResponse, TopicBriefing, and StoryArc types mirror backend schemas.
- There is no shared code generation; the frontend contracts are hand-maintained and already diverge in places (for example article detail does not include image_url or categories).
Configuration and environment loading
Concern	Implementation
Backend env	backend/config.py:14 loads backend/.env relative to config.py. backend/database.py:7 calls load_dotenv() separately, which is working-directory-sensitive.
Frontend env	NEXT_PUBLIC_* values are inlined by Next.js at build time from frontend/.env.local; see frontend/lib/api.ts:1, frontend/lib/supabase/client.ts, frontend/proxy.ts.
Database URL	DATABASE_URL, defaulting to sqlite:///./et_news.db (backend/database.py:9). Because it is relative, the effective database file depends on the process working directory.
LLM models	GROQ_MODEL defaults to openai/gpt-oss-120b; GROQ_MODEL_SMALL defaults to openai/gpt-oss-20b (backend/config.py:16-34).
LLM reasoning	GROQ_REASONING_EFFORT, default low, only sent for openai/gpt-oss* models (backend/llm.py:172-174).
CORS	CORS_ORIGINS, defaulting to http://localhost:3000 and http://127.0.0.1:3000 (backend/config.py:20, :63-68).
Secrets	GROQ_API_KEY, NEWS_API_KEY, DATABASE_URL backend; NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL frontend. Values were not read or printed.
backend/.env, frontend/.env.local, and backend/et_news.db are ignored by Git (.gitignore:24, frontend/.gitignore:34).
Persistence
- Server-side: SQLite through SQLAlchemy. Base.metadata.create_all(bind=engine) runs at startup (backend/main.py:63). There are no Alembic migrations.
- Startup side effect: backfill_categories(db) runs synchronously over every article at startup (main.py:68-75).
- Browser-local: et_ai_categories, et_ai_topics, et_ai_onboarded, et_ai_bookmarks in localStorage; et_chat_carry and et_navigator_selection in sessionStorage.
- In-memory: Zustand stores for sidebar state, active feed tab, and preferences; React component state for loaded articles, briefings, and chat messages.
External services
Service	Role	Authentication
RSS feeds	News discovery	None
NewsAPI	Fallback top-headlines and topic search	NEWS_API_KEY
Groq	LLM completions	GROQ_API_KEY
Supabase	Email/password auth and session cookies	Public anon key in frontend
Publisher CDNs	Article images through Next Image	None
Google Fonts	Fonts at build time	None
Local development
1. Backend: cd backend && uvicorn main:app --reload --port 8000.
2. Frontend: cd frontend && npm install && npm run dev.
3. Optional manual population: cd backend && python refresh_db.py.
4. Swagger: http://localhost:8000/docs.
3. Architecture Diagram
Article briefing sequence
4. Complete Data Lifecycle
Stage-by-stage table
#	Stage	Status	Where it happens	What actually happens
1	Discovery	Implemented	fetcher.py:77-147, :149-200	Iterates 12 RSS URLs; fetches first 8 entries per feed. NewsAPI top-headlines is only used when RSS returns fewer than 10 articles.
2	Fetching/parsing	Implemented	fetcher.py:83-94	requests.get(..., timeout=8) then feedparser.parse(response.content). HTTP errors are skipped with a print; exceptions are caught per feed.
3	Normalisation	Partial	fetcher.py:95-143, :166-196	Maps title/link/summary/source/category/image/date. Summary is truncated to 500 chars. content is set to the same summary. Read time is estimated from the summary. No full-text extraction, no HTML cleanup, no timezone normalisation.
4	Deduplication	Partial	fetcher.py:96-98, routers/feed.py:54-56	Article ID is md5(link) or md5(url). If an ID already exists, the row is skipped entirely. No title/similarity deduplication; existing articles are never updated.
5	Classification	Implemented, rule-based	taxonomy.py:38-675, categorization.py:48-97	18 canonical categories, word-boundary keyword matching, legacy aliases, multi-label output, provenance (legacy, keyword, legacy+keyword, manual).
6	NER + sentiment	Implemented, local	enricher.py:80-111	spaCy on headline + summary[:1000]; VADER on the same text. Entities and sentiment are written into the article row.
7	Storage	Implemented	routers/feed.py:46-92, models.py	One SQLAlchemy transaction per ingestion batch; article row plus category rows. entities is JSON-serialised, then serialised again by the JSON column (see §9).
8	Feed retrieval	Implemented, chronological	routers/feed.py:206-236, :271-281	Keyset pagination by published_at DESC, id DESC; 12 per page, maximum 50.
9	Personalisation	Partial	routers/feed.py:292-329	Strict filter on ArticleCategory.category IN selected; then chronological pagination. No relevance ordering.
10	Article detail	Implemented, summary only	routers/articles.py:10-35	Returns headline, summary, source, category, URL, read time, sentiment label, entities. Does not return content, categories, or image_url.
11	AI briefing	Implemented, LLM	briefing_router.py:39-134, graph.py, synthesis_agent.py	Up to 15 recent articles selected, plus related same-category articles; LangGraph enriches, ranks, and calls Groq; truncation recovery is implemented. No cache.
12	Story Arcs / related synthesis	Partial	routers/story_arc.py:40-183, chat/page.tsx:157-193	Story Arcs group articles by exact shared entity; Navigator sends selected IDs to the briefing endpoint with a topic-wise prompt.
13	Article/topic chat	Partial	routers/chat.py:11-68	One article context (headline, summary, entities, sentiment, URL) or ten recent headlines; no content, no chat history, no RAG.
14	Frontend rendering	Implemented	home/page.tsx, ArticleReader.tsx, trending/page.tsx, etc.	Typed API client, cursor state machine, Markdown rendering, loading/empty/error states, responsive layouts.
The distinct data paths
A. General feed
Home → useFeed → getFeed → GET /feed/ → get_feed → optional _maybe_ingest → _paginate → ArticleOut[] → reducer → BentoMonochrome.
B. For You feed
usePreferencesStore.categories → getPersonalisedFeed → GET /feed/personalised?categories=... → _resolve_categories → SQL EXISTS filter on article_categories → chronological pagination. No LLM, no ranking agent.
C. Article briefing
ArticleReader → getArticle and getBriefing → /briefing/ → select requested article plus same-category related articles → LangGraph pipeline.invoke → Groq → BriefingResponse.
D. Topic briefing / Navigator
Topbar search or Navigator selection → /home/topic/{label} or /chat?mode=navigate → /briefing/topic or /briefing/ with TOPIC_WISE_SUMMARY → keyword retrieval plus optional NewsAPI enrichment → Groq.
E. Story Arcs
Trending → getStoryArcs → /story-arcs/ → latest 60 articles → group by entity → aggregate sentiment/key players → one small-model Groq call per arc.
F. Chat
ArticleReader panel or ChatPage → sendChatMessage → /chat/ → fixed article context or ten recent headlines → Groq → ChatOut with sources: [].
5. NLP Pipeline — Detailed Analysis
Summary of genuine NLP components
Component	Technique	Library/model	Executed where	Persisted?
Named Entity Recognition	Statistical NER	spaCy en_core_web_sm	Ingestion and briefing request	Yes, articles.entities
Sentiment	Lexicon + rules	VADER SentimentIntensityAnalyzer	Ingestion and briefing request	Yes, score and label
Category classification	Keyword/regex rules	taxonomy.py and enricher.py	Ingestion, startup backfill	Yes, article_categories
Briefing generation	Abstractive LLM generation	Groq gpt-oss-120b	/briefing/, /briefing/topic	No
Story Arc text	Abstractive LLM generation	Groq gpt-oss-20b	/story-arcs/	No
Chat	LLM question answering	Groq gpt-oss-120b	/chat/	No
Text cleanup	HTML unescape/regex	Python stdlib	Classification	No
A. Named Entity Recognition
Problem addressed: identify organisations, people, places, and products mentioned in a news item so the UI can show “key entities”, the sidebar can surface recurring topics, and Story Arcs can group coverage.
Implementation: backend/enricher.py:6 loads spacy.load("en_core_web_sm") at module import. enrich_article builds:
text = f"{article.get('headline', '')} {article.get('summary', '')}"
doc = nlp(text[:1000])
entities = list(set([
    ent.text for ent in doc.ents
    if ent.label_ in ["ORG", "PERSON", "GPE", "PRODUCT"]
]))
article["entities"] = entities[:10]
Preprocessing: none beyond concatenating headline and summary and truncating to 1,000 characters. HTML is not stripped before spaCy sees the text.
Library and conceptual behaviour: en_core_web_sm is a small English spaCy pipeline with a statistical NER component. It predicts entity spans and labels from contextual features. This is genuine NER, not keyword matching.
Output and storage: a list of entity strings, de-duplicated with set, capped at 10, saved into the JSON entities column.
Consumers:
- routers/feed.py:182-203 returns entities in ArticleOut.
- ArticleReader.tsx:396-412 renders “Key entities”.
- routers/feed.py:332-364 counts entities over the latest 50 articles for the sidebar.
- routers/story_arc.py:46-68 groups articles by exact shared entity.
- briefing_router.py:201-218 counts entities for topic-briefing key entities.
- routers/chat.py:26-37 includes entities in chat context.
- agents/ranking_agent.py:29-37 gives a small entity-interest boost.
Limitations:
- NER sees only headline plus summary, often under 100 words.
- set() destroys frequency and mention order; no salience ranking.
- No entity linking or normalisation: “US”, “USA”, “United States” remain separate; “Microsoft” and “Microsoft Corp” remain separate.
- No coreference resolution.
- The same entity may be extracted differently across articles, which weakens Story Arc grouping.
- Short financial headlines are noisy; the local database snapshot contains examples such as “Iran” in a JetBlue headline, illustrating the need for an error analysis rather than proving a general failure rate.
B. Sentiment Analysis
Implementation: backend/enricher.py:7 creates one SentimentIntensityAnalyzer. enrich_article calls analyzer.polarity_scores(text) on the same headline-plus-summary text and uses the compound score:
if compound >= 0.05: label = "positive"
elif compound <= -0.05: label = "negative"
else: label = "neutral"
The score and label are stored in articles.sentiment_score and articles.sentiment_label.
What VADER is: a lexicon- and rule-based sentiment analyser designed for social-media-style text. It combines a valence lexicon with heuristics for negation, intensifiers, punctuation, capitalization, and contrast. It is not a trained finance classifier.
What is produced: neg, neu, pos, and compound; only compound and a three-way label are persisted. The API exposes sentiment_label but not sentiment_score.
Consumers:
- Feed cards and article detail show the label indirectly; Navigator uses a coloured dot (navigator/page.tsx:17-21).
- Story Arcs compute overall sentiment and a trend from labels.
- Briefing prompts include Sentiment: ....
- Ranking gives positive a +0.3 boost and negative a -0.1 boost (ranking_agent.py:3, :26-27).
What it does not measure: emotion, bias, factuality, misinformation, market direction, investor sentiment, or the sentiment of the full article body. A positively worded headline about a market fall can be labelled positive. A neutral factual headline can be labelled neutral even if the article is alarming.
Limitations:
- Headline plus lede only; no body.
- VADER’s lexicon is general-purpose, not financial.
- The current database snapshot is heavily skewed: 94 positive, 37 negative, 15 neutral out of 146 articles. That is a descriptive snapshot, not an accuracy result.
- The score is not calibrated or evaluated against human labels.
C. Topic Classification and Category Assignment
This is rule-based, not machine learning.
backend/taxonomy.py defines 18 Category objects (:38-554), each with an ID, display label, and keyword tuple. Examples include business-economy, markets-investing, technology, artificial-intelligence, startups-vc, science-research, cybersecurity, politics-government, world-news, india-news, climate-environment, energy, healthcare, education, sports, entertainment-culture, gaming, and automotive-mobility.
Preprocessing: clean_text (taxonomy.py:630-634) joins headline and summary, HTML-unescapes, strips tags with a regex, collapses whitespace, and lowercases.
Matching: _keyword_pattern (:614-618) builds a case-insensitive regex with lookarounds that prevent matching inside alphanumeric words. classify (:643-675) returns every matching category, so one article can have several labels. It also maps feed/enricher legacy labels through LEGACY_ALIASES (:560-609).
Primary label: primary_category_id (:678-693) prefers the legacy feed category over keyword matches. This is deliberate: a Markets story mentioning AI remains primarily Markets, with artificial-intelligence as a secondary category.
Persistence: categorization.sync_article_categories (:48-97) writes ArticleCategory rows. It never deletes source='manual' rows, updates provenance in place, and relies on the composite primary key (article_id, category) for idempotence. backfill_categories (:100-144) rebuilds automatic categories for all articles at startup.
At ingestion: routers/feed.py:76-88 passes the feed’s own category as legacy and then sets the article’s single display label from the primary category. This means the enricher’s own detect_category result is usually not the persisted primary label; the source feed label wins.
Category counts: category_counts (categorization.py:147-158) counts rows in article_categories. Because classification is multi-label, the sum of counts can exceed the number of articles. At audit time there were 146 articles and 334 category rows, with 110 articles having more than one category.
Ambiguous articles: handled by multi-label assignment, but there is no confidence score, no probabilistic classifier, and no tie-breaking beyond taxonomy order and legacy precedence.
Empty categories: all 18 categories are returned with count 0 by category_infos (taxonomy.py:734-743). The preferences UI disables categories with zero stories (CategoryPicker.tsx:24-32).
Important precision issue: broad keywords such as india, indian, rbi, sebi, sensex, and nifty are in india-news; broad terms such as market, policy, technology, and government appear in several categories. The local snapshot has 49 india-news mappings and 62 markets-investing mappings, so multi-label counts should not be interpreted as disjoint topic shares.
The enricher’s second classifier: enricher.py:9-78 defines an older 8-category keyword scorer (Markets, Economy, Tech, Startups, Policy, Science, Sports, Entertainment). It is used by detect_category, and it runs during ingestion and again during briefing enrichment. However, its persisted influence is limited because upsert_articles uses the feed category as legacy and the canonical taxonomy for the final label. During the briefing pipeline it can overwrite the in-memory category field with a legacy label, which then appears in the prompt. This is a design inconsistency worth explaining rather than hiding.
D. Summarisation and AI Briefings
There is no extractive summariser. The system does not use TextRank, LexRank, BART, or a sentence-selection algorithm. All summaries are abstractive LLM output, except that the raw RSS summary is displayed as the article summary.
Entry point: POST /briefing/ in agents/briefing_router.py:39-134.
Article selection:
- If article_ids are supplied, the primary articles are fetched by ID.
- Related articles are the latest six in the same primary category, excluding the requested IDs (:49-56).
- If the IDs do not resolve, the endpoint silently falls back to the latest 15 articles (:57-60).
- Without IDs, it uses the latest 15 articles (:61-64).
Profile construction: briefing_router.py:66-76 builds a profile dictionary. It maps topic_preferences to profile.entity_interests and entity_interests to the same field. Since entity_interests actually stores saved category IDs, the ranking agent receives category IDs where it expects topics and entities.
Input to the LLM: agents/synthesis_agent.py:57-80 builds an article block containing headline, source, category, sentiment, summary (up to 1,200 chars), and optionally an extract (up to 3,000 chars). The extract is omitted when it is not meaningfully longer than the summary. This is important: because content equals summary for RSS articles, the “extract” is usually omitted.
Prompt variants: _prompt_for (:83-162) chooses:
1. TOPIC_WISE_SUMMARY — group by category, output ### CATEGORY sections.
2. A free-text query — answer in 3–5 paragraphs under 180 words.
3. A focus-article briefing — ### Top Story, ### Key Themes, ### Market Signal or Overall Impact, ### What's Next.
4. A general briefing with the same four-section structure.
Generation parameters: chat_completion_result with temperature 0.6, output budgets 1400 tokens for article briefings, 1000 for topic, 900 for query; retry budgets 700, 600, 550. At most eight articles are sent (synthesis_agent.py:208).
Truncation handling: CompletionResult.truncated is true when finish_reason == "length" (llm.py:60-62). run_synthesis makes one shorter regeneration (:226-250). If the retry fails or is also truncated, it returns the partial draft with complete=False and truncated=True. The router adds an incomplete notice (briefing_router.py:34-37, :129-133).
Validation: only non-empty content and finish reason are checked. The structure is not validated; missing sections are not detected; claims are not checked against the supplied articles.
Failure behaviour: LLMServiceError is caught by synthesis_node (graph.py:65-87) and replaced with a generic fallback briefing, degraded=True, HTTP 200. The frontend shows an unavailable message rather than the fallback text in ArticleReader.tsx:368-372.
Caching: none. Every article page view triggers a new LLM call. There is no briefing table or cache key.
Grounding: the prompt says “Never invent facts, figures or sections” (synthesis_agent.py:29-31), and sources are named in the prompt. That is an instruction, not a guarantee. There is no retrieval verification, no citation-to-source matching, and no factuality evaluation.
E. Multi-Article Synthesis and Story Arcs
How multi-article selection works:
- Article briefing: primary article plus latest six same-category articles.
- Topic briefing: keyword containment over the latest 50 articles; if fewer than five matches, NewsAPI /everything is called and results are inserted; then the latest 100 are re-scanned. If still empty, the latest 10 articles are used regardless of topic (briefing_router.py:159-194).
- Navigator: user-selected IDs; the first selected article’s category supplies six related articles.
- Story Arcs: exact entity co-occurrence over the latest 60 articles; entities appearing in at least two articles; top five entities by article count.
What is deterministic: candidate retrieval, grouping, sentiment aggregation, key-player counts, timeline construction, and fallback text.
What is LLM-generated: briefing prose, topic angles, Story Arc descriptions, and “what to watch”.
Story Arc construction details (routers/story_arc.py):
 1. Load latest 60 articles.
 2. Parse entities JSON defensively.
 3. Build entity -> [articles] for entity strings with length >4 and <50.
 4. Keep entities with at least two articles.
 5. Take the top five by article count.
 6. Sort each group ascending by published_at.
 7. Build a timeline from the first six articles in that ascending order (:78-87).
 8. Count co-occurring entities as “key players” (:89-104).
 9. Compute overall sentiment by comparing positive and negative counts with a 1.5 ratio (:106-115).
10. Compute a “trend” by splitting the sentiment list into halves (:117-127). This list is built from arts, not arts_sorted, so it is not reliably chronological.
11. Ask the small model for a two-sentence description and a one-sentence “what to watch” from up to eight headlines (:129-169).
12. Fall back to data-derived text if the LLM fails or returns invalid JSON.
Does this genuinely track evolving stories over time? No. It is a request-time entity co-occurrence view. There is no persistent story entity, no incremental update, no event extraction, no entity resolution, no cross-day state, and no verification that the six timeline items are the most important or the most recent. The timeline taking the earliest six is a concrete correctness limitation.
Hallucination potential: the description and “what to watch” are generated from headlines only. They can speculate beyond the reporting. The prompt explicitly asks for a “1 sentence prediction” (story_arc.py:152), but no predictive capability is evaluated. The UI should be described as “LLM-generated forward-looking commentary”, not forecasting.
F. Article Chat and Question Answering
Request path:
ArticleReader.handleArticleChat (:145-171) or ChatPage.handleSend (:210-244) → sendChatMessage in lib/api.ts:216-234 → POST /chat/ → routers/chat.py:11-68.
Context construction in routers/chat.py:
- If article_id is present and found, the system prompt includes headline, source, category, summary, entities, sentiment label, and URL (:26-38). It does not include content.
- If no article is found, the prompt includes only ten recent headlines (:40-46).
- The user’s current message is the only conversation turn included (:60-67).
- There is no retrieval over the article corpus, no vector search, no chunking, and no history table.
Is this RAG? No. It is ordinary fixed-context prompting. The only “retrieval” is a primary-key lookup of one article.
Chat history: retained only in React state (ArticleReader.tsx:73, chat/page.tsx:88-94) and optionally carried to /chat through sessionStorage (ArticleReader.tsx:186-200). The backend never receives prior messages, so follow-up questions like “why?” lose the previous answer.
Sources: ChatOut(response=..., sources=[]) always returns an empty list (chat.py:68). The frontend chat does not display citations. The topic page prepends [Context: Topic ..., focusing on "...", Top articles: ...] to the user message and hides it visually (topic/[label]/page.tsx:36, :120-128, :408), which is a prompt hack rather than structured retrieval.
Grounding: the system prompt says “use the article context” and “never say there’s no article provided” (chat.py:53-58), but there is no guarantee the model obeys. Article text is untrusted and is inserted directly into the system prompt, creating prompt-injection risk.
G. Other NLP Components
Technique	Present?	Evidence / note
HTML unescaping and tag stripping	Yes, for classification	taxonomy.clean_text
Word-boundary regex matching	Yes	taxonomy._keyword_pattern
Keyword extraction	No dedicated algorithm	Only NER entities and category keywords
Text embeddings / semantic similarity	No	No application imports of sentence-transformers, chromadb, or vector search
Text classification model	No	Rule-based only
Entity linking / relation extraction	No	Raw spaCy entity strings only
Language detection	No	English-only assumptions
Coreference resolution	No	spaCy small model pipeline, no custom coref
Summarisation model	No local summariser	Groq LLM only
Retrieval ranking	Simple SQL and keyword containment	No BM25, embeddings, or learning-to-rank
LLM topic analysis	Yes	Topic briefing angles and Story Arc descriptions
Installed but not executed: chromadb, sentence-transformers, transformers, torch, scikit-learn, scipy, numpy, and langchain-groq have no imports in backend/. The presence of torch and sentence-transformers in requirements.txt should not be presented as evidence of embedding-based NLP.
6. Conventional NLP vs Rules vs LLMs
Category	What NEXUS uses it for	Where	Is it NLP?	Evidence and limits
Conventional NLP	Named-entity recognition	enricher.py:84-88	Yes	Statistical spaCy NER on headline + summary; no entity linking or evaluation
Conventional NLP	Sentiment scoring	enricher.py:91-98	Yes	VADER lexicon/rule scoring; headline + summary only; not emotion or bias
Rule-based processing	18-category classification	taxonomy.py:614-675	Yes, but deterministic rules, not learned	Keyword regex, legacy aliases, multi-label
Rule-based processing	Legacy 8-category detection	enricher.py:9-78	Yes, deterministic	Mostly superseded by canonical taxonomy for persisted labels
Rule-based processing	Deduplication	fetcher.py:96-98	No, ordinary software	Exact MD5 of URL; no fuzzy matching
Rule-based processing	Story Arc grouping	story_arc.py:46-68	No, ordinary aggregation	Exact entity string co-occurrence
Database / ranking	Feed pagination and filtering	routers/feed.py:206-236, :292-329	No	Keyset cursor, SQL EXISTS, chronological order
Database / ranking	Briefing rank score	ranking_agent.py:5-49	No, heuristic ranking	Category weight, substring topic match, sentiment boost, entity match
Database / ranking	Attention EMA	attention.py:10-45	No, heuristic update	Not called by the frontend
LLM-powered	Article/topic briefings	synthesis_agent.py, briefing_router.py	Yes, generation	Abstractive synthesis; no factuality check
LLM-powered	Story Arc descriptions	story_arc.py:139-169	Yes, generation	Headline-only context; speculative “what to watch”
LLM-powered	Chat / QA	routers/chat.py	Yes, generation	Fixed context; no RAG or history
Application/UI	Routing, layout, state, auth	Next.js app, Zustand, Supabase	No	Ordinary application engineering
Application/UI	Markdown rendering/sanitisation	Markdown.tsx	No	skipHtml, images disabled, external link handling
Why an LLM does not make every component NLP: NLP is defined by the task — analysing or generating natural language. A database query that filters category IDs is not NLP even if the categories were produced by NLP. A React card layout is not NLP. The feed ranker is a heuristic over metadata. Conversely, NEXUS can legitimately be called an NLP-powered system because it actually runs NER, sentiment analysis, rule-based text classification, and LLM-based summarisation and question answering.
No model training claim: the code loads a pre-trained spaCy model, uses a pre-built VADER lexicon, and calls hosted Groq models. There is no fine-tuning, no training loop, no labelled dataset, and no model checkpoint produced by this project.
7. Backend and API Architecture
Startup
backend/main.py:61-77 defines the FastAPI lifespan:
1. Base.metadata.create_all(bind=engine) creates missing tables.
2. A database session runs backfill_categories(db).
3. Backfill failures are logged and rolled back; the API still starts.
4. yield releases the lifespan.
There is no migration system. New columns added to models will not be applied to an existing SQLite file by create_all.
Router registration
main.py:102-108 registers:
- /feed → routers/feed.py
- /articles → routers/articles.py
- /chat → routers/chat.py
- /attention → routers/attention.py
- /users → routers/users.py
- /briefing → agents/briefing_router.py
- /story-arcs → routers/story_arc.py
/health is defined directly on the app (:111-113).
Middleware and error handling
- UnhandledErrorMiddleware (main.py:20-58) catches unexpected exceptions and returns JSON {"detail":"Internal server error."} with CORS headers. It is added before CORSMiddleware, so CORS wraps it.
- LLMServiceError has a dedicated handler (main.py:94-99) returning {"detail": user_message, "code": code} with the mapped status.
- llm.classify_error maps provider errors: timeout → 504, connection → 502, auth → 503, model-not-found → 503, rate limit → 429, upstream 5xx → 502, bad request → 502 (llm.py:97-130).
- Provider error details are logged as model/status/provider code/request ID, not prompts or keys (llm.py:183-190).
Database access pattern
- database.get_db yields a session and closes it in finally (database.py:18-23).
- Routes use Depends(get_db).
- Most writes commit inside the route or helper (upsert_articles, save_preferences, record_attention).
- upsert_articles commits once after the batch; one malformed row can abort the batch and trigger the caller’s rollback.
- No explicit transaction isolation or retry strategy beyond rollback/logging.
LLM client
llm.get_client lazily creates one cached Groq client; reset_client exists for tests (llm.py:65-82). chat_completion returns just text; chat_completion_result returns text, finish reason, model, and token usage (:133-221). There is no application-level retry around provider calls; retries are explicit only in briefing truncation recovery.
API endpoints
Endpoint	Method	Purpose	Main functions called	Important inputs	Response
/health	GET	Liveness	health	None	{"status":"ok"}
/feed/	GET	General chronological feed	get_feed, _maybe_ingest, _paginate	cursor, limit	FeedPage
/feed/categories	GET	Canonical categories with counts	get_categories, category_counts, category_infos	None	CategoriesOut (18 categories)
/feed/personalised	GET	Category-filtered For You feed	get_personalised_feed, _resolve_categories, _paginate	user_id, categories, cursor, limit	FeedPage
/feed/trending-topics	GET	Entity/category frequencies	get_trending_topics	None	{"topics":[...]}
/articles/{article_id}	GET	Article detail	get_article	Path ID	ArticleOut or 404
/chat/	POST	Article/global chat	chat, chat_completion	user_id, message, article_id?	ChatOut
/attention/	POST	Record attention signal	record_attention, update_user_profile	user_id, article_id, dwell_seconds, scroll_depth, clicked	{"status":"recorded"}
/users/preferences	POST	Save category preferences	save_preferences, normalize_ids	user_id, categories/topics	{status,categories,weights}
/users/{user_id}/profile	GET	Read profile/preferences	get_profile	Path user ID	Profile object
/briefing/	POST	Article/general/topic-wise briefing	generate_briefing, pipeline.invoke	user_id, query?, article_ids?	BriefingResponse
/briefing/topic	POST	Four-angle topic briefing	generate_topic_briefing, chat_completion_result	topic, user_id	TopicBriefingResponse
/story-arcs/	GET	Entity-grouped story arcs	get_story_arcs, chat_completion	None	List[StoryArc]
Note: the README says 12 endpoints; the current app exposes 13 including /health.
Representative request end-to-end: GET /feed/?limit=12
 1. Home mounts and calls useFeed (home/page.tsx:42-47).
 2. useFeed calls getFeed({limit:12}) (useFeed.ts:84-89).
 3. getFeed builds /feed/?limit=12 and calls fetch (api.ts:128-134).
 4. FastAPI routes to get_feed (feed.py:271-281).
 5. Because cursor is None, _maybe_ingest runs (:95-126): throttle check, non-blocking lock, fetch_rss_articles, possibly fetch_newsapi_articles, upsert_articles.
 6. upsert_articles checks existing IDs, enriches new articles, inserts Article, flushes, syncs ArticleCategory, sets the primary display label, commits.
 7. _paginate orders by coalesce(published_at, EPOCH) DESC, id DESC, fetches limit+1, loads category mappings for the page, serializes to ArticleOut.
 8. FastAPI returns JSON FeedPage.
 9. feedReducer stores the page and cursor; BentoMonochrome renders cards.
10. If ingestion fails, the route serves existing rows; if the database fails entirely, the unhandled-error middleware returns JSON 500.
8. Frontend Architecture
Routes and layouts
Route	File	Data source	Notes
/	app/(marketing)/page.tsx	Static/mock content	Cinematic landing page; mock article and metrics
/login, /signup	app/(auth)/...	Supabase	Email/password; Google button is inert
/home	app/(app)/home/page.tsx	/feed/ and /feed/personalised	General/For You tabs
/home/article/[id]	app/(app)/home/article/[id]/page.tsx	/articles/{id}, /briefing/, /chat/	Canonical reader
/home/topic/[label]	app/(app)/home/topic/[label]/page.tsx	/briefing/topic, /articles/{id}, /chat/	Topic intelligence
/navigator	app/(app)/navigator/page.tsx	/feed/?limit=50	Multi-select story library
/saved	app/(app)/saved/page.tsx	localStorage + /articles/{id}	Browser-only bookmarks
/trending	app/(app)/trending/page.tsx	/story-arcs/, /briefing/	Story Arcs
/chat	app/(app)/chat/page.tsx	/chat/, /briefing/, /feed/	Full chat and Navigator synthesis
/article/[id]	app/(app)/article/[id]/page.tsx	None	Permanent redirect to /home/article/[id]
unmatched	app/not-found.tsx	None	404 page
The (app)/layout.tsx shell contains Sidebar, Topbar, MobileNav, and PreferencesDialog. Per-route layout.tsx files only add metadata.
Data-fetching strategy
- No TanStack Query provider. Pages use useEffect plus useState, or the custom useFeed hook.
- Requests are cache: "no-store" and use AbortController where the feed is concerned.
- ApiError preserves backend detail and code; network failures are translated into a user-facing message.
- There is no global cache, so navigating away and back refetches.
State management and persistence
State	Mechanism	Scope
Sidebar collapsed	Zustand useSidebarStore (lib/store/index.ts)	Session
Active feed tab	Zustand useFeedStore	Session
Category preferences	Zustand usePreferencesStore + localStorage + backend profile	Persistent
Bookmarks	lib/bookmarks.ts + localStorage	Browser only
Onboarded flag	localStorage et_ai_onboarded	Browser only
Feed pages/cursors	useReducer in feed-reducer.ts	Component lifetime
Briefing/chat	React state	Component lifetime
Article-to-chat carry	sessionStorage et_chat_carry	Tab session
Navigator selection	sessionStorage et_navigator_selection	Tab session
Personalisation persistence
- hydrate(userId) reads local categories, then, if authenticated, calls getProfile(userId) and uses server categories when non-empty (preferences.ts:189-219).
- save writes locally for guests; for authenticated users it calls savePreferences and normalises the returned IDs (:268-297).
- The onboarding dialog is a single category-selection dialog, not the README’s “3-step” flow. PreferencesIn.sources and depth exist in the backend schema but are never collected or used.
- A signed-in save failure does not fall back to local storage; the dialog shows an error.
Article cards and detail
- BentoMonochrome (components/ui/bento-monochrome.tsx) computes an asymmetric 12-column layout from the number of articles and renders feature/medium/wide/compact cards.
- Cards link to /home/article/{id}; category display uses categories and preferred IDs for For You (:34-43).
- The For You badge is driven by is_personalised (:25-27, :136-146), which the backend sets to true for every article in a personalised page.
- ArticleReader displays the primary category, read time, headline, source/date, save button, chat button, external “Read Full Article” link, summary, AI briefing, and key entities.
- It does not display the stored content; the article body is not available. The backend detail response also omits image_url, so the reader’s image block never receives a URL from the detail endpoint.
- ArticleReader calls getBriefing("demo_user", ...) and sendChatMessage("demo_user", ...) with a hard-coded user, so signed-in identity is not used for article briefings/chat.
Briefing and chat rendering
- Briefings and assistant messages are rendered with components/markdown/Markdown.tsx.
- ReactMarkdown is configured with remarkGfm, remarkBreaks, skipHtml, custom heading/paragraph/list/table components, and img: () => null (Markdown.tsx:17-143). Raw HTML is skipped; publisher images inside model output are not loaded.
- External links get target="_blank" and rel="noopener noreferrer" (:73-85).
- The article reader shows a warning notice if the briefing is incomplete (ArticleReader.tsx:379-387).
- ChatPanel is presentational; conversation state remains in the caller (ChatPanel.tsx:12-16).
- Chat messages are not persisted server-side. ChatPage displays a hard-coded “Active topic: India AI Policy Framework / Tracking 3 story threads / Updated 2h ago” card (chat/page.tsx:349-359); this is decorative, not backed by data.
Pagination and load-more
- useFeed maintains separate state per tab, a request counter to ignore stale responses, abort controllers, and a fingerprint of tab/user/categories.
- Load more is a button, not automatic infinite scroll. The sentinel only controls whether the button appears (home/page.tsx:90-106, :290-313).
- feedReducer de-duplicates by article ID and requires both has_more and next_cursor before allowing more pages (feed-reducer.ts:132-152).
- Changing category filters changes the fingerprint; a stale cursor is rejected by the backend with 400.
Loading, empty, and error states
- FeedSkeleton, ArticleSkeleton, ChatSkeleton, and Skeleton components cover loading.
- EmptyState distinguishes “no categories selected”, “no stories in selected categories”, and “no stories at all” (home/page.tsx:125-190).
- ErrorState covers initial feed failure; an inline retry block covers “load more” failure.
- aria-live, aria-busy, role="tabpanel", aria-pressed, and skip links are used in several places.
Responsive layout
- Sidebar is hidden below md; MobileNav is fixed at the bottom.
- Bento cards collapse from 12-column spans to stacked/mid-size spans.
- Article chat becomes a full-width panel above the article on small screens and a sticky right column on lg.
- Topic chat is a fixed bottom sheet on mobile and a right-side floating panel on desktop.
Implemented vs decorative
UI element	Status
Feed, article, briefing, topic, Story Arcs, chat	Connected to backend
Saved articles	Connected to localStorage only; backend Bookmark table unused
Notification bell and messages	Decorative
“Active topic” chat card	Hardcoded decorative text
Marketing hero metrics (10k+, 2.4k) and sample article	Hardcoded mock data
“Continue with Google”	No click handler
“AI agents rank” marketing copy	Does not match feed behaviour
“Every read, skip, and save trains your feed”	Not implemented; attention endpoint is never called
“3-step onboarding”	One-step category dialog
9. Database and Data Model
ER diagram
erDiagram
  ARTICLES ||--o{ ARTICLE_CATEGORIES : "article_id"
  USER_PROFILES {
    string id PK
    string user_id UK
    json category_weights
    json entity_interests
    float avg_read_time
    int total_sessions
    datetime updated_at
  }
  ARTICLES {
    string id PK
    string headline
    text summary
    text content
    string source
    string category
    string url
    string image_url
    datetime published_at
    int read_time
    float sentiment_score
    string sentiment_label
    json entities
    bool enriched
    datetime created_at
  }
  ARTICLE_CATEGORIES {
    string article_id PK, FK
    string category PK
    string source
    datetime created_at
  }
  ATTENTION_SIGNALS {
    int id PK
    string user_id
    string article_id
    float dwell_seconds
    float scroll_depth
    bool clicked
    datetime created_at
  }
  BOOKMARKS {
    int id PK
    string user_id
    string article_id
    datetime created_at
  }
article_categories.article_id has a real foreign key with ON DELETE CASCADE. user_profiles.user_id, attention_signals.user_id, attention_signals.article_id, and bookmarks.user_id/article_id are logical strings with no foreign keys.
Entity purposes and fields
Entity	Purpose	Important fields	Relationships
Article	One ingested news item	id (MD5 of URL), headline, summary, content, source, category (primary display label), url, image_url, published_at, read_time, sentiment_score, sentiment_label, entities, enriched	One-to-many to ArticleCategory
ArticleCategory	Multi-label canonical category plus provenance	(article_id, category) composite PK, source (legacy, keyword, legacy+keyword, manual)	Belongs to Article
UserProfile	Saved category preferences and engagement weights	user_id unique, category_weights JSON, entity_interests JSON, avg_read_time, total_sessions	Logical link to Supabase user; no FK
AttentionSignal	Raw dwell/scroll/click events	user_id, article_id, dwell_seconds, scroll_depth, clicked	No FK; endpoint exists but no frontend caller
Bookmark	Intended server-side saved articles	user_id, article_id	No FK; unused by any route
What is stored permanently
- Articles and their extracted entities/sentiment.
- Canonical category mappings and provenance.
- Saved category preferences per user_id.
- Attention signals and bookmarks if the corresponding endpoints are called. At audit time both tables were empty.
What is computed at request time
- Feed pages and cursors.
- Category counts.
- Trending topics.
- Article briefings and topic briefings.
- Story Arcs, timelines, key players, sentiment trend, and LLM descriptions.
- Chat answers.
What exists only in the browser
- Bookmarks (et_ai_bookmarks).
- Guest category preferences (et_ai_categories).
- Onboarded flag.
- Chat messages and article-to-chat carry.
- Navigator selection.
Observed local database snapshot
Read-only query of backend/et_news.db at audit time:
- 146 articles.
- 334 article_categories rows; 110 articles have more than one category.
- 1 user_profiles row (demo_user) with legacy weights {"Sports": 0.8, "Tech": 0.8, "Entertainment": 0.8} and legacy entity_interests ["Sports","Tech","Entertainment"].
- 0 attention_signals; 0 bookmarks.
- Sentiment labels: 94 positive, 37 negative, 15 neutral.
- Primary category distribution: 51 Markets & Investing, 49 Technology, 23 Business & Economy, 8 Startups & Venture Capital, 4 Science & Research, 4 Politics & Government, 4 Entertainment & Culture, 2 Sports, 1 Artificial Intelligence.
- Sources include Mint (62), Economic Times (43), NDTV Profit (23), Inc42 (8), The Verge (5), Wired (2), BBC News (2), Gizmodo (1).
These are descriptive statistics from one local database, not an evaluation result.
Schema and data-quality notes
- No migrations. create_all creates missing tables but does not alter existing columns.
- Entities are double-encoded. routers/feed.py:71-72 calls json.dumps on a list before assigning it to a SQLAlchemy JSON column. The column then serialises the string again, so the stored text is a JSON string such as "[\"US\"]" rather than a JSON array. Every reader compensates with isinstance(entities, str) and json.loads, so it works, but it is fragile and should be explained honestly.
- ArticleOut is not fully populated in article detail. routers/articles.py:23-34 omits image_url and categories, and passes article.category/article.source/article.url without fallbacks even though those columns are nullable. A row with a null category, source, or URL can cause a validation error. The feed serializer is more defensive (feed.py:189-203).
- Bookmark is dead schema. No backend route reads or writes it.
- avg_read_time and total_sessions are never updated. The attention updater only writes category_weights.
- No chat history, briefing cache, or Story Arc tables. All generated content is ephemeral.
- SQLite concurrency. The engine uses check_same_thread=False, but there is no write queue, WAL configuration, or retry policy. Ingestion and background attention updates can contend for the write lock. Inferred risk
10. Personalization and Ranking
The actual General feed algorithm
GET /feed/
if cursor is None:
    maybe_ingest()                 # at most once per 120s, non-blocking lock
query = SELECT * FROM articles
if cursor:
    query = query WHERE (coalesce(published_at, EPOCH), id) < (cursor.t, cursor.id)
rows = query ORDER BY coalesce(published_at, EPOCH) DESC, id DESC
       LIMIT limit + 1
has_more = len(rows) > limit
return first limit rows, next_cursor if has_more
This is chronological, not relevance-ranked. There is no recency score, popularity score, click model, or embedding similarity.
The actual For You feed algorithm
selected = explicit categories query param
           or profile.entity_interests normalized
if selected is empty:
    return empty page
query = SELECT a.* FROM articles a
        WHERE EXISTS (
          SELECT 1 FROM article_categories ac
          WHERE ac.article_id = a.id
            AND ac.category IN selected
        )
rows = query ORDER BY published_at DESC, id DESC LIMIT limit + 1
mark every returned article is_personalised = True
This is filtering, not ranking. It genuinely excludes unselected categories; it does not merely down-rank them. The order inside the selected set is chronological. A multi-label article appears if any of its categories is selected, and is de-duplicated by the EXISTS/article join.
What the ranking agent actually does
backend/agents/ranking_agent.py:5-49 is only invoked by the LangGraph briefing pipeline (graph.py:39-47), which is only reached from /briefing/ and /briefing/topic (the latter uses its own path). It does not affect /feed/ or /feed/personalised.
score(article) =
    1.0
  + category_weights.get(article.category, 0.0)
  + 0.4 * count(topic in headline+summary for topic in topic_preferences)
  + SENTIMENT_BOOST[sentiment]          # positive +0.3, negative -0.1
  + 0.3 * count(entity in article.entities for entity in entity_interests)

sort descending
is_personalised = score > 1.3
Why the ranking agent is mostly ineffective today
1. It receives the wrong profile fields. briefing_router.py:70-76 sets both topic_preferences and entity_interests from profile.entity_interests, which stores category IDs, not topic phrases or entity names.
2. Category weights are legacy labels. The local demo_user profile has keys Sports, Tech, and Entertainment; article categories are now canonical labels such as Sports, Technology, and Entertainment & Culture. Only exact Sports matches; Tech/Entertainment do not match the canonical labels.
3. Enrichment rewrites category before ranking. run_enrichment calls enrich_article, which can replace the canonical category with one of the eight legacy labels (Markets, Economy, Tech, etc.). This further reduces weight matching.
4. The output flag is not shown in the briefing UI. relevance_score and is_personalised are added to dictionaries but the briefing response only exposes ranked_count; the feed uses a blanket is_personalised=True.
5. There is no recency term, despite the README’s “five-component formula incorporating … recency”.
6. There is no learning. The formula is fixed; no weights are learned from clicks, saves, or dwell time.
Attention/engagement logic
backend/routers/attention.py:10-45 implements an exponential moving average:
engagement = min(dwell_seconds / 60, 1.0)
if clicked: engagement += 0.3
if scroll_depth > 0.7: engagement += 0.2

weights[category] = round(weights[category] * 0.8 + engagement * 0.2, 3)
But the frontend never calls it. recordAttention exists in lib/api.ts:236-254 and is not imported or invoked by any component. The attention_signals table had zero rows. Reading, saving, and clicking do not affect personalisation today.
Even if it were wired, the weights are not bounded (engagement can reach 1.5), and avg_read_time/total_sessions are not updated.
UI vs backend differences
UI/README statement	Actual backend
“AI agents rank and curate stories based on your reading patterns”	General feed is chronological; For You filters categories and sorts chronologically. Engagement is not recorded.
“Agent pipeline Enrichment → Ranking → Synthesis”	True for /briefing/; not used for the feed.
“Preferences seed initial category_weights”	save_preferences stores categories in entity_interests; category_weights remains {} for new profiles (users.py:61-73).
“Every read, skip, and save trains your feed”	No frontend call to /attention/; bookmarks are local only.
“Five-component relevance formula including recency”	Four components in code (category, topic substring, sentiment, entity); no recency.
“For You is personalised ranking”	It is a strict category filter; every returned card is labelled For You.
What is absent
- No collaborative filtering.
- No content-based similarity beyond substring matching.
- No embeddings or vector index.
- No learning-to-rank.
- No click-through model.
- No source preferences or reading-depth preferences despite the API accepting fields for them.
11. External Services and Security Boundaries
Service and data flow
Service	Data sent	Data received	Failure behaviour
RSS feeds	GET request with a browser-like User-Agent	Titles, links, summaries, dates, images	Per-feed exception is printed and skipped; feed still serves stored articles
NewsAPI top-headlines	Country in, category business, page size 20, API key	Article metadata	Returns [] on exception or missing key
NewsAPI everything	Topic query, language en, sort by relevancy, API key	Article metadata	Returns []; topic briefing may fall back to unrelated recent articles
Groq	System/user prompts containing article headlines/summaries and chat text	Generated text, finish reason, usage	Typed LLMServiceError; briefing falls back to a generic message; chat returns an error
Supabase	Email/password auth, session cookies	User identity/session	Frontend catches guest fallback in useCurrentUserId; some other calls may throw
Publisher CDNs	Image URL	Image bytes via Next Image optimizer	Missing image fallback in ArticleThumbnail
Risks and limitations
API keys and secrets
- GROQ_API_KEY and NEWS_API_KEY are server-side only; they are not sent to the browser.
- config.groq_api_key raises a typed error if missing and does not echo the key (config.py:52-60).
- NEXT_PUBLIC_SUPABASE_ANON_KEY is public by design for Supabase browser auth; no service-role key appears in the frontend.
- .env files and the SQLite database are Git-ignored.
- There is no secret rotation or rate limiting.
External API failures and rate limits
- RSS/NewsAPI failures are swallowed; the feed silently serves older data.
- Groq rate limits map to HTTP 429 with a friendly message; there is no queue, backoff, or per-user quota.
- A user can trigger LLM calls repeatedly by opening articles, topics, or chat; there is no cost control.
- Ingestion is lazy and synchronous in the request path. Twelve feeds with an 8-second timeout each can make the first feed request slow in the worst case. Inferred from code; not measured
- _last_ingest_at is updated even when ingestion fails, so retries are delayed for 120 seconds.
Untrusted article text in prompts
- RSS summaries and titles are inserted directly into briefing, topic, Story Arc, and chat prompts.
- There is no prompt-injection defence, content delimiting, or instruction hierarchy.
- A malicious feed item could attempt to override system instructions. Markdown rendering is sanitised, but the generated text can still be misleading.
Hallucination and factual consistency
- The LLM is instructed not to invent facts, but there is no verification.
- Briefing “sources” are article IDs, not inline citations; the model may cite a source name that is not actually supporting the sentence.
- Topic briefings can run with zero retrieved articles if the database is empty, because there is no if not related guard after the fallback.
- Story Arc “what to watch” is explicitly asked for as a prediction but has no predictive evaluation.
CORS and transport
- CORS defaults to localhost origins and allows credentials; it can be overridden with CORS_ORIGINS.
- This is appropriate for local development, but CORS is not authentication.
- The default HTTP URLs are local development URLs; production transport is not configured.
Authentication and authorization
- Supabase authentication is enforced only in the browser.
- frontend/proxy.ts refreshes the session but does not redirect unauthenticated users or protect (app) routes.
- The backend trusts the user_id supplied in JSON/query parameters. There is no JWT verification, session check, or ownership check on /users/{user_id}/profile, /users/preferences, /chat/, or /attention/.
- Any caller who can reach the backend can read or write another user’s preferences, chat as another user, or submit attention signals for another user. This is an IDOR-style boundary weakness.
- The demo_user account is a shared fallback; article briefings and chat hard-code it.
Input validation and output rendering
- Pydantic validates request shapes and enum-like category IDs are normalised strictly.
- message, topic, and article_ids have no length or count limits.
- article_ids that do not resolve silently fall back to the latest 15 articles, which can produce an unrelated briefing.
- parsed JSON from the topic/Story Arc LLM is checked for parseability but not for object shape; a JSON array can cause an AttributeError and a 500. Inferred; depends on model output
- Markdown rendering uses skipHtml, disables images, and handles external links; article summaries are rendered as text via stripHtml. This is a reasonable XSS posture.
- Next Image allows any HTTPS host (next.config.ts), which is broad but restricted to images and has SVG disabled.
Duplicate and stale news
- Deduplication is exact URL MD5 only. The same story from two publishers, or the same publisher with tracking parameters, becomes two articles.
- Existing rows are never updated, so corrected headlines, changed summaries, and updated publication times are ignored.
- Ingestion only happens when the first page of a feed is requested, at most every 120 seconds. There is no scheduler, so an idle app does not ingest.
- The database can contain stale articles; Story Arcs consider the latest 60 by published_at.
User preference and saved-article persistence
- Guest preferences are localStorage only; clearing the browser loses them.
- Authenticated preferences are server-side but only category IDs; sources and depth are accepted by the schema and ignored.
- Bookmarks are localStorage only; the backend bookmarks table is unused. Saved articles do not sync across devices.
- Chat history is not persisted; closing the page loses it.
- Briefings are not cached; every view costs another LLM call.
12. End-to-End Execution Examples
The article content below is fictional and illustrative. It is not a real test result.
Example 1: A new article arrives
Illustrative feed entry
Title: RBI holds repo rate at 6.5% as inflation eases
Link: https://example.com/rbi-holds-repo-rate
Summary: <p>The Reserve Bank of India kept the repo rate unchanged on Wednesday,
citing easing food inflation and a stable rupee.</p>
Published: 2026-10-28T09:15:00+05:30
Source feed: Mint Economy
Step-by-step
 1. fetch_rss_articles iterates the Mint Economy RSS URL (fetcher.py:32-35).
 2. requests.get fetches the feed with an 8-second timeout (:83-87).
 3. feedparser.parse parses entries; this entry is within the first eight.
 4. article_id = md5(link) (:96-98).
 5. published_at is converted from published_parsed to a naive datetime (:99-101).
 6. summary is read from the feed, truncated to 500 characters, and also assigned to content (:102-104, :132).
 7. read_time is estimated from the summary word count (:73-75, :138).
 8. The source category is Economy; no image is found.
 9. upsert_articles checks whether the ID exists; it does not (feed.py:54-56).
10. enrich_article builds headline + summary, runs spaCy, and extracts entities such as Reserve Bank of India (ORG) and India (GPE). VADER scores the text; if the compound is above 0.05, the label is positive.
11. enrich_article also runs the legacy detect_category and may return Economy, but the persisted primary label will be based on the feed’s Economy legacy category through the canonical taxonomy.
12. sync_article_categories classifies the text against the 18-category taxonomy. Economy maps to business-economy; keywords such as rbi, repo rate, inflation, rupee, and india may add business-economy and india-news. The article gets multiple ArticleCategory rows with provenance.
13. primary_category_id prefers the legacy business-economy; the display label becomes Business & Economy (feed.py:86-88).
14. The Article row and category rows are committed.
15. On the next GET /feed/, the article appears in chronological order. If the reader selected business-economy or india-news, it also appears in For You.
What is stored: headline, summary, content equal to the summary, source, primary category label, URL, publication date, estimated read time, entities, VADER score/label, enriched=True, and category rows.
What is not stored: the full article body, a cleaned HTML-free summary, entity frequencies, category confidence, or a deduplication fingerprint beyond the URL hash.
Example 2: A user opens an article and requests an AI briefing
Trigger
The reader clicks a card linking to /home/article/{id}. ArticleReader mounts (ArticleReader.tsx:56).
Step-by-step
1. getArticle(id) calls GET /articles/{id} (api.ts:174-180).
2. get_article queries the article and returns ArticleOut (articles.py:10-35). The response contains the summary but not the stored content, categories, or image_url.
3. The reader renders the headline, source, date, summary, and key entities. It does not render a full article body.
4. The useEffect in ArticleReader.tsx:111-143 calls:
POST /briefing/
{
  "user_id": "demo_user",
  "query": null,
  "article_ids": ["<article-id>"]
}
 5. generate_briefing loads the primary article and up to six latest articles with the same primary category (briefing_router.py:44-56).
 6. It builds dictionaries; content is included only for the requested article (:87-99). Since content is the same 500-character summary, the synthesis helper will usually omit it as redundant.
 7. It loads UserProfile for demo_user and maps categories into the ranking profile (:66-76).
 8. pipeline.invoke runs:
- enrichment_node → run_enrichment → enrich_article again;
- ranking_node → run_ranking;
- synthesis_node → run_synthesis.
 9. run_synthesis places the focus article first, takes the top eight articles, and builds the prompt (synthesis_agent.py:198-210).
10. Groq generates the briefing. If finish_reason == "length", one shorter regeneration is attempted. If it still fails, the partial text is returned with complete=False.
11. BriefingResponse contains briefing, sources_used, ranked_count, pipeline_steps, degraded, complete, truncated, and notice (briefing_router.py:122-134).
12. ArticleReader renders the briefing as Markdown and shows an incomplete notice if needed (:373-387).
What the model actually sees: headline, source, category, sentiment label, and up to 1,200 characters of summary for each of up to eight articles. It does not see the full article body, the article URL, or a verified citation graph.
Failure modes: a provider error becomes a generic degraded briefing with HTTP 200; the reader shows “AI briefing is unavailable”. A slow provider has no application-level timeout/retry beyond the SDK and the truncation retry.
Example 3: A user asks a question about an article
Trigger
The reader opens the chat panel and asks: “What does this mean for borrowers?”
Step-by-step
1. handleArticleChat appends the user message to local state (ArticleReader.tsx:145-150).
2. sendChatMessage("demo_user", message, article.id) sends:
POST /chat/
{
  "user_id": "demo_user",
  "message": "What does this mean for borrowers?",
  "article_id": "<article-id>"
}
3. chat looks up the article (chat.py:15-18).
4. It builds article_context with headline, source, category, summary, entities, sentiment label, and URL (:26-38). It does not include content.
5. It fetches the ten latest articles and builds a headline-only news_context (:40-46), but this is only used when no article context exists.
6. It constructs a system prompt telling the model to use the article context and cite sources (:48-58).
7. It sends the current user message as the only user turn (:60-67).
8. Groq returns text. ChatOut returns it with sources=[] (:68).
9. The panel renders the answer as Markdown.
What is missing:
- No previous chat turns are sent, so a follow-up “why?” has no conversational memory.
- No full article body.
- No retrieval of related articles for that question.
- No structured citations; sources is always empty.
- No guarantee the model stays within the article; only prompt instructions.
Topic chat variant: the topic page prepends [Context: Topic "...", focusing on "...", Top articles: ...] to the user message and passes the first article’s ID (topic/[label]/page.tsx:120-128). The backend sees that prefix as part of the user message. It is a prompt-engineering workaround, not a separate retrieval layer.
13. Academic Problem Statement and NLP Mapping
A defensible problem statement
NEXUS investigates whether a hybrid pipeline that combines lightweight local NLP (named-entity recognition, sentiment scoring, and rule-based multi-label classification), deterministic retrieval and aggregation, and hosted LLM generation can convert a continuous multi-source business-news stream into (a) a reader-controlled chronological feed with transparent topical metadata, (b) source-attributed multi-article briefings, and (c) entity-centric views of related coverage. The project focuses on integration and transparency rather than on training a new model or proving a new NLP algorithm.
This wording is defensible because it describes what the code does. It does not claim that news overload is scientifically established, that the system reduces reading time by a measured amount, or that the LLM is factual.
Why a chronological feed is insufficient for the intended workflow
A chronological feed answers “what is newest?” but not:
- “What are the main threads across these stories?”
- “Which stories mention the same organisation or place?”
- “What background should I know before reading this article?”
- “Can I restrict my feed to the topics I follow?”
- “Can I ask a follow-up question about this story?”
NEXUS addresses those needs with category metadata, multi-article prompting, entity grouping, and fixed-context chat. Whether these features actually improve comprehension or save time is an empirical question that has not been evaluated here.
Which parts are NLP and which are software engineering
Part	Nature
spaCy entity extraction	NLP
VADER sentiment	NLP
Keyword taxonomy classification	NLP-adjacent rule-based text classification
LLM briefing/topic/Story Arc/chat generation	NLP generation
RSS/NewsAPI ingestion	Software engineering / data integration
SQLite schema and queries	Database engineering
Cursor pagination	Software engineering
Category filtering	Database/query logic
Ranking formula	Heuristic scoring, not learned NLP
React rendering, Zustand, localStorage	Frontend engineering
Supabase authentication	Application security/infrastructure
Markdown sanitisation	Application security
Mapping table
User problem	NEXUS capability	Actual technique	Code location	Expected benefit	Limitation
Too many stories to scan	General feed with infinite pagination	SQL keyset pagination, chronological order	feed.py:206-281	Predictable, stable browsing	No relevance ranking; stale/duplicate items possible
Too many topics	18-category multi-label metadata	Regex keyword taxonomy, legacy aliases, provenance	taxonomy.py, categorization.py	Transparent filtering and counts	Rule-based; broad keywords inflate labels; no confidence
Want only selected topics	For You feed	SQL EXISTS filter on category mappings	feed.py:292-329	Strict exclusion of unselected categories	No learned ranking; every result marked For You
Need context around a story	Article briefing	LLM synthesis over up to 8 articles	synthesis_agent.py, briefing_router.py	Compact multi-article overview	Shallow source text; no factuality check; no cache
Need multiple perspectives on a topic	Topic briefing	Keyword retrieval plus LLM four-angle JSON	briefing_router.py:154-329	Structured angles	Keyword retrieval can overmatch; fallback can be unrelated; angles are not verified to use different articles
Losing the thread across days	Story Arcs	Exact entity co-occurrence, sentiment aggregation, LLM blurb	story_arc.py	Entity-centric timeline view	Not true temporal tracking; earliest-six timeline; no entity resolution
Want to ask follow-up questions	Article/topic chat	Fixed context plus LLM	chat.py	Conversational explanation	No history, no RAG, no full body, empty sources
Need key actors quickly	NER key entities	spaCy en_core_web_sm	enricher.py:84-88	Fast entity overview	Short text, no linking, set-based dedupe
Need a quick read-time cue	Read-time estimate	Word count / 200 on summary	fetcher.py:73-75	Simple UI cue	Based on summary, not full article; usually underestimates
What the project contributes
1. Integration: it connects ingestion, local NLP, taxonomy, persistence, APIs, and a React UI in one working application.
2. Transparency: category provenance is stored; the feed distinguishes General from For You; the briefing response exposes degraded/truncated states.
3. Bounded generation: briefing truncation is detected and recovered rather than silently accepted.
4. Multi-label news metadata: the taxonomy supports several categories per article, avoiding a single-label simplification.
5. A testable baseline: the deterministic pieces (taxonomy, pagination, cursor behaviour, preferences, LLM error handling) have tests; this is a foundation for future evaluation.
What would be unjustified
- “NEXUS detects misinformation or fake news.” There is no fact-checking, source-credibility model, or claim verification.
- “NEXUS measures bias.” VADER measures lexical sentiment, not political or framing bias.
- “NEXUS guarantees factual accuracy.” The LLM is only prompt-constrained.
- “NEXUS predicts the future.” Story Arc “what to watch” is generated commentary, not a validated forecast.
- “NEXUS learns from your behaviour.” Attention tracking is not wired to the frontend.
- “NEXUS understands full articles.” It processes headline plus feed summary.
- “NEXUS uses semantic search/RAG.” There are no embeddings or vector retrieval.
- “NEXUS trains its own model.” It uses pre-trained spaCy, a VADER lexicon, and hosted Groq models.
- “NEXUS reduces reading time by 70%.” The README’s impact table is an estimate, not a measured result.
Claims that need external citations if used in a thesis or viva
 1. News overload / information overload as a documented problem.
 2. The 15–20 minute baseline for reading eight articles.
 3. The claimed 70% time reduction and 36–60 minutes saved per day.
 4. The prevalence and cost of duplicate news coverage.
 5. VADER’s validity on financial news headlines.
 6. spaCy en_core_web_sm accuracy on short business-news text.
 7. LLM summarisation factuality and hallucination rates for news.
 8. The effect of personalised feeds on comprehension or engagement.
 9. The relationship between headline sentiment and market movement.
10. The definition and value of “story arcs” as a news-consumption construct.
14. Limitations and Claims We Must Avoid
Concrete implementation limitations
 1. No full-text news extraction. content equals the RSS summary (fetcher.py:132, :185, :239). Briefings and chat cannot reason over the body.
 2. Very short NLP input. NER and VADER see headline plus summary, truncated to 1,000 characters; the summary itself is capped at 500 characters.
 3. No evaluation. No labelled entity/sentiment/category dataset, no precision/recall, no human evaluation, no factuality metric, no user study.
 4. Rule-based categories are not a trained classifier. They are transparent and testable, but precision/recall on the live corpus is unknown.
 5. Sentiment is not domain-specific. VADER is lexical and general-purpose; it does not measure financial sentiment, emotion, bias, or factuality.
 6. No entity resolution. Entity strings are exact; “US”, “USA”, and “United States” are distinct; Story Arcs cannot merge them.
 7. Story Arcs are not persistent temporal tracking. They are recomputed from the latest 60 articles on every request. The timeline uses the earliest six items in ascending order, and the sentiment trend halves use an unsorted list.
 8. Briefing ranking is largely ineffective. The feed does not use it; the profile fields are mismatched; category weights use legacy labels; there is no recency term.
 9. Attention tracking is not connected. recordAttention has no caller; attention_signals is empty; saving/reading does not train anything.
10. No RAG or chat memory. Chat uses one fixed article context or ten headlines and only the current user message.
11. No caching. Every article view and Story Arc page can trigger multiple LLM calls.
12. Ingestion is request-driven and blocking. There is no scheduler; the first page after the throttle window performs network fetches in the request path.
13. No backend authentication or authorization. user_id is client-supplied; the backend never verifies a Supabase JWT.
14. No migrations. create_all does not alter existing tables; schema evolution is manual.
15. Data-model quirks. Entities are double-encoded; article detail omits fields and lacks null fallbacks; Bookmark is dead schema.
16. Prompt injection and hallucination are unmitigated. Untrusted feed text is inserted into prompts; output is only Markdown-sanitised, not fact-checked.
17. Topic retrieval is keyword containment. It can overmatch on common words and falls back to unrelated recent articles.
18. Story Arc LLM output shape is not validated. A non-object JSON response can raise an error after parsing.
19. No rate limiting or cost controls. Repeated LLM requests are possible.
20. Frontend and marketing overclaim. Several UI statements do not match the implementation.
“Do not say” table
Do not say	Why	Defensible alternative
“NEXUS detects fake news / misinformation.”	No fact-checking or claim verification exists.	“NEXUS summarises and organises news; it does not verify truth.”
“NEXUS detects bias.”	VADER is sentiment, not framing or political bias analysis.	“NEXUS reports lexical sentiment of headlines and summaries.”
“NEXUS guarantees accurate briefings.”	LLM output is prompt-constrained only.	“NEXUS generates briefings that are instructed to stay grounded; factual accuracy is not verified.”
“NEXUS predicts what happens next.”	Story Arc “what to watch” is generated speculation.	“NEXUS offers LLM-generated forward-looking commentary.”
“NEXUS learns your reading behaviour.”	Attention endpoint is not called.	“NEXUS supports explicit category preferences; engagement learning is scaffolded but not wired.”
“NEXUS ranks the feed with AI.”	Feed order is chronological; ranking only affects briefings.	“The feed is chronologically ordered; For You filters by selected categories.”
“NEXUS uses RAG.”	No embeddings, vector store, or retrieval per question.	“NEXUS uses fixed article context and multi-article prompting.”
“NEXUS understands the full article.”	Only headline and feed summary are stored.	“NEXUS analyses the headline and available feed summary.”
“NEXUS uses semantic similarity.”	No embeddings or similarity model in execution.	“NEXUS uses category rules, entity matching, and keyword containment.”
“NEXUS trains its own model.”	No training code or dataset.	“NEXUS uses pre-trained spaCy/VADER and hosted Groq models.”
“NEXUS tracks stories over time.”	Arcs are recomputed from a recent window and not persisted.	“NEXUS builds entity-grouped views over recent coverage.”
“The system saves 70% of reading time.”	No measurement.	“The README estimates a time saving; it has not been empirically validated.”
Dead code, unused dependencies, placeholders, and mismatches
Item	Evidence	Status
Backend Bookmark model/table	models.py:76-81; no route references	Dead schema
Frontend recordAttention	api.ts:236-254; no caller	Dead client code
AttentionSignal data	Table empty; endpoint exists	Scaffolded but unused
@tanstack/react-query	package.json; no imports	Unused dependency
langchain-groq, chromadb, sentence-transformers, transformers, torch, scikit-learn, scipy, numpy	requirements.txt; no application imports	Installed but unused
mockArticles, categoryColorMap	lib/mock-data.ts; only categoryStyles imported by HeroSection.tsx	Unused data
PreferencesIn.sources, depth	users.py:19-20; never read	Accepted but ignored
“3-step onboarding”	README; PreferencesDialog only selects categories	Mismatch
“Google OAuth”	AuthForm.tsx:346-358; button has no handler	Decorative
“9 sources”	README; fetcher.py has 12 URLs / 5 publishers	Mismatch
“Next.js 14”	README; package.json has 16.2.1	Stale documentation
“AI-ranked feed”	feed.py chronological; ranking only briefings	Overclaim
“Full article” reader	articles.py returns summary only; no body	Overclaim
“Story arc prediction”	story_arc.py:152 asks for a prediction; no evaluation	Speculative
is_personalised in feed	Set true for every personalised row (feed.py:232), not score-based	Simplified flag
pipeline_steps	Hard-coded list (briefing_router.py:27)	Decorative metadata
Chat sources	Always [] (chat.py:68)	Not implemented
“Active topic” chat card	Hardcoded text (chat/page.tsx:349-359)	Placeholder
Notification panel	Hardcoded messages (Topbar.tsx:132-160)	Decorative
Marketing metrics	Hardcoded 10k+, 2.4k (HeroSection.tsx:161-162)	Mock content
demo_user	Hardcoded in ArticleReader.tsx:122, :152, chat/page.tsx:167, :218, trending/page.tsx:292	Identity mismatch
Article detail image_url/categories	articles.py:23-34 omits both	Frontend/backend mismatch
Article detail null fallbacks	articles.py passes nullable columns directly	Potential 500
Entities double-encoded	feed.py:71-72; readers defensively parse strings	Data-quality quirk
avg_read_time, total_sessions	Never updated	Dead fields
refresh_db.py	Manual script only	Not part of runtime
15. Code-Reading Roadmap for the Viva
The 15 files to read, in learning order
#	File	What it does	Functions/classes to study	Concept it teaches	Read before
1	backend/main.py	App startup, lifespan, middleware, router registration	lifespan, UnhandledErrorMiddleware, health	FastAPI composition, startup side effects, error boundaries	Nothing
2	backend/models.py	SQLAlchemy schema	Article, ArticleCategory, UserProfile, AttentionSignal, Bookmark	Relational modelling and provenance	database.py
3	backend/fetcher.py	RSS/NewsAPI discovery and normalisation	fetch_rss_articles, fetch_newsapi_articles, search_external_articles, estimate_read_time	Data ingestion, dedupe IDs, feed parsing	models.py
4	backend/enricher.py	spaCy NER, VADER sentiment, legacy keyword categories	detect_category, enrich_article	Actual local NLP pipeline	fetcher.py
5	backend/taxonomy.py	18-category canonical taxonomy and rules	Category, classify, primary_category_id, normalize_ids, category_infos	Rule-based text classification, aliases, multi-label design	enricher.py
6	backend/categorization.py	Persists categories, preserves manual provenance, backfills	sync_article_categories, backfill_categories, category_counts, categories_for_articles	Idempotent persistence and provenance	taxonomy.py, models.py
7	backend/routers/feed.py	Ingestion trigger, upsert, pagination, personalised filter	upsert_articles, _maybe_ingest, _encode_cursor, _decode_cursor, _paginate, get_feed, get_personalised_feed, get_trending_topics	Keyset pagination, SQL filtering, ingestion lifecycle	fetcher.py, categorization.py
8	backend/agents/graph.py	LangGraph 3-node pipeline	NewsState, enrichment_node, ranking_node, synthesis_node, build_pipeline	Stateful orchestration and fallback design	enricher.py
9	backend/agents/ranking_agent.py	Briefing-only relevance scoring	run_ranking, SENTIMENT_BOOST	Heuristic ranking, personalisation caveats	graph.py
10	backend/agents/synthesis_agent.py	Prompt construction, article block limits, truncation recovery	_articles_block, _prompt_for, run_synthesis, SynthesisOutcome	Prompt engineering, token budgeting, bounded generation	graph.py, llm.py
11	backend/agents/briefing_router.py	Briefing and topic-briefing endpoints	generate_briefing, generate_topic_briefing, BriefingResponse, TopicBriefingResponse	API contracts and LLM JSON handling	synthesis_agent.py
12	backend/routers/chat.py	Article/global chat prompt	chat	Fixed-context QA and its limits	llm.py
13	backend/routers/story_arc.py	Entity grouping, sentiment aggregation, LLM blurb	get_story_arcs, StoryArc, TimelineEvent, KeyPlayer	Entity co-occurrence and temporal limitations	enricher.py
14	frontend/lib/api.ts	Typed backend client	request, getFeed, getPersonalisedFeed, getBriefing, sendChatMessage, getStoryArcs	Frontend/backend contract	Backend endpoints
15	frontend/app/(app)/home/page.tsx	Feed UI, tabs, onboarding, load-more, empty/error states	AppHomePage, renderEmpty, IntersectionObserver logic	Client state, pagination UX, preference integration	api.ts, useFeed.ts, feed-reducer.ts
Pair with these while reading:
- frontend/lib/hooks/useFeed.ts and frontend/lib/feed-reducer.ts for the cursor state machine.
- frontend/components/article/ArticleReader.tsx for the briefing/chat UI and its hard-coded demo_user.
- frontend/lib/store/preferences.ts for local/server preference hydration.
- backend/llm.py for the Groq error contract.
- backend/tests/test_feed_pagination.py, test_taxonomy.py, test_briefing_truncation.py, and test_llm_config.py for the behaviours the authors considered important.
A 10-minute viva sequence
Time	What to show	Key sentence
0:00–1:00	Problem and architecture diagram	“NEXUS turns a multi-source RSS stream into a category-filtered feed, multi-article briefings, entity-grouped arcs, and fixed-context chat.”
1:00–3:00	fetcher.py → enricher.py → taxonomy.py → feed.py	“This is the real NLP layer: spaCy NER, VADER sentiment, and a deterministic 18-category multi-label taxonomy.”
3:00–5:00	feed.py pagination and For You	“The General feed is chronological; For You is a strict category filter, not a learned ranker.”
5:00–7:00	graph.py → ranking_agent.py → synthesis_agent.py → briefing_router.py	“The briefing pipeline is a fixed three-node LangGraph; it sends up to eight articles to Groq and handles truncation with one retry.”
7:00–8:30	chat.py and story_arc.py	“Chat is fixed-context prompting, not RAG; Story Arcs are entity co-occurrence over recent articles, not persistent tracking.”
8:30–9:30	frontend/lib/api.ts, home/page.tsx, ArticleReader.tsx	“The frontend uses a typed fetch client, cursor state machine, Markdown rendering, and explicit loading/error/empty states.”
9:30–10:00	Limitations and evaluation plan	“The honest gap is evaluation: no labelled NLP benchmark, no factuality metric, no user study. The next step is a gold-standard sample and a baseline comparison.”
Five questions faculty are likely to ask
1. “Is this really NLP, or just an LLM wrapper?”
- Answer: both. The system runs genuine local NER and sentiment, and uses deterministic text classification. The LLM handles generation. Be explicit that the classifier is rule-based, not trained.
2. “Why use spaCy and VADER instead of a transformer?”
- Answer: low latency, no per-article API cost, and a transparent baseline. The trade-off is domain mismatch and short-text noise; a transformer or finance-tuned sentiment model is a future comparison, not current functionality.
3. “How do you know the categories are correct?”
- Answer: you do not yet. The taxonomy is rule-based and unit-tested for mapping behaviour, but there is no precision/recall evaluation on a labelled corpus. Propose a manually annotated sample.
4. “How do you prevent hallucinations?”
- Answer: you do not fully. The prompt instructs the model to stay grounded, the briefing is bounded to retrieved articles, and truncation is detected; but there is no claim verification. This is an acknowledged limitation.
5. “What is novel here?”
- Answer: not a new algorithm. The contribution is the integration of a transparent local NLP layer, a multi-label taxonomy with provenance, a bounded multi-article synthesis pipeline, and a reader-facing application. Present it as a systems contribution with an evaluation gap.
One-paragraph defense
NEXUS is a hybrid news-intelligence system, not a misinformation detector or a trained model. It ingests RSS and NewsAPI articles, runs local spaCy NER and VADER sentiment on the headline and feed summary, assigns transparent multi-label categories from an 18-category rule-based taxonomy, and stores the results in SQLite. The reader gets a chronological General feed, a strictly category-filtered For You feed, LLM-generated briefings over up to eight articles, entity-grouped Story Arcs, and fixed-context chat. The engineering is real and tested, but the scientific claims must remain modest: there is no gold-standard NLP evaluation, no factuality guarantee, no RAG, no behavioural personalisation wired to the UI, and no full-article understanding. The strongest academic framing is a systems integration with a clear evaluation plan, not a claim of solved news understanding.
End of audit. No repository files were changed.
