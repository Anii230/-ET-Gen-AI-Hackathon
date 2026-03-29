const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Article = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  category: string;
  url: string;
  image_url?: string;
  published_at: string;
  read_time: number;
  sentiment_label: string;
  entities: string[];
  is_personalised: boolean;
};

export type BriefingResponse = {
  briefing: string;
  sources_used: string[];
  ranked_count: number;
  pipeline_steps: string[];
};

export async function getFeed(): Promise<Article[]> {
  const res = await fetch(`${BASE}/feed/`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch feed");
  return res.json();
}

export async function getPersonalisedFeed(
  userId: string
): Promise<Article[]> {
  const res = await fetch(
    `${BASE}/feed/personalised?user_id=${userId}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to fetch personalised feed");
  return res.json();
}

export async function getArticle(id: string): Promise<Article> {
  const res = await fetch(`${BASE}/articles/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Article not found");
  return res.json();
}

export async function getBriefing(
  userId: string,
  query?: string,
  articleIds?: string[]
): Promise<BriefingResponse> {
  const res = await fetch(`${BASE}/briefing/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      query: query || null,
      article_ids: articleIds || null,
    }),
  });
  if (!res.ok) throw new Error("Briefing failed");
  return res.json();
}

export async function sendChatMessage(
  userId: string,
  message: string,
  articleId?: string
): Promise<{ response: string; sources: Article[] }> {
  const res = await fetch(`${BASE}/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      message,
      article_id: articleId || null,
    }),
  });
  if (!res.ok) throw new Error("Chat failed");
  return res.json();
}

export async function recordAttention(
  userId: string,
  articleId: string,
  dwellSeconds: number,
  scrollDepth: number,
  clicked: boolean
): Promise<void> {
  await fetch(`${BASE}/attention/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      article_id: articleId,
      dwell_seconds: dwellSeconds,
      scroll_depth: scrollDepth,
      clicked,
    }),
  });
}

export async function savePreferences(
  userId: string,
  topics: string[],
  sources: string[],
  depth: string
): Promise<void> {
  await fetch(`${BASE}/users/preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, topics, sources, depth }),
  });
}

export type TopicBriefing = {
  topic: string;
  total_articles: number;
  angles: Array<{
    angle: string;
    content: string;
    article_count: number;
  }>;
  key_entities: string[];
  sentiment_summary: string;
  what_to_watch: string;
  article_ids: string[];
};

export type StoryArc = {
  id: string;
  title: string;
  description: string;
  timeline: Array<{
    date: string;
    headline: string;
    source: string;
    sentiment: string;
    article_id: string;
  }>;
  key_players: Array<{name: string; mention_count: number}>;
  overall_sentiment: string;
  sentiment_trend: string;
  what_to_watch: string;
  article_count: number;
};

export async function getTopicBriefing(
  topic: string,
  userId: string = "demo_user"
): Promise<TopicBriefing> {
  const res = await fetch(`${BASE}/briefing/topic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, user_id: userId }),
  });
  if (!res.ok) throw new Error("Topic briefing failed");
  return res.json();
}

export async function getTrendingTopics(): Promise<{
  topics: Array<{label: string; type: string; count: number}>
}> {
  const res = await fetch(`${BASE}/feed/trending-topics`, {
    cache: "no-store"
  });
  if (!res.ok) throw new Error("Failed to fetch topics");
  return res.json();
}

export async function getStoryArcs(): Promise<StoryArc[]> {
  const res = await fetch(`${BASE}/story-arcs/`, {
    cache: "no-store"
  });
  if (!res.ok) throw new Error("Failed to fetch story arcs");
  return res.json();
}
