const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Error carrying a user-safe message from the backend. */
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 0, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_MESSAGE = "Something went wrong. Please try again.";
const NETWORK_MESSAGE =
  "Can't reach the news service. Check that the backend is running and try again.";

async function request<T>(
  path: string,
  init?: RequestInit,
  fallback = DEFAULT_MESSAGE
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch {
    // fetch rejects on connection refused / CORS failure, which browsers
    // report as a bare TypeError ("NetworkError"). Translate it.
    throw new ApiError(NETWORK_MESSAGE, 0, "network_error");
  }

  if (!res.ok) {
    let message = fallback;
    let code: string | undefined;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string" && body.detail.trim()) {
        message = body.detail;
      }
      if (typeof body?.code === "string") {
        code = body.code;
      }
    } catch {
      // Non-JSON error body; keep the fallback message.
    }
    throw new ApiError(message, res.status, code);
  }

  return res.json() as Promise<T>;
}

/** Fire-and-forget request for non-critical signals. Never throws. */
async function requestVoid(path: string, init: RequestInit): Promise<void> {
  try {
    await fetch(`${BASE}${path}`, init);
  } catch {
    // Attention/preference signals are best-effort.
  }
}

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
  degraded?: boolean;
};

export async function getFeed(): Promise<Article[]> {
  return request<Article[]>("/feed/", { cache: "no-store" }, "Failed to fetch feed");
}

export async function getPersonalisedFeed(
  userId: string
): Promise<Article[]> {
  return request<Article[]>(
    `/feed/personalised?user_id=${encodeURIComponent(userId)}`,
    { cache: "no-store" },
    "Failed to fetch personalised feed"
  );
}

export async function getArticle(id: string): Promise<Article> {
  return request<Article>(
    `/articles/${encodeURIComponent(id)}`,
    { cache: "no-store" },
    "Article not found"
  );
}

export async function getBriefing(
  userId: string,
  query?: string,
  articleIds?: string[]
): Promise<BriefingResponse> {
  return request<BriefingResponse>(
    "/briefing/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        query: query || null,
        article_ids: articleIds || null,
      }),
    },
    "The briefing is unavailable right now."
  );
}

export async function sendChatMessage(
  userId: string,
  message: string,
  articleId?: string
): Promise<{ response: string; sources: Article[] }> {
  return request<{ response: string; sources: Article[] }>(
    "/chat/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        message,
        article_id: articleId || null,
      }),
    },
    "The assistant is unavailable right now."
  );
}

export async function recordAttention(
  userId: string,
  articleId: string,
  dwellSeconds: number,
  scrollDepth: number,
  clicked: boolean
): Promise<void> {
  await requestVoid("/attention/", {
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
  await requestVoid("/users/preferences", {
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
  return request<TopicBriefing>(
    "/briefing/topic",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, user_id: userId }),
    },
    "The topic briefing is unavailable right now."
  );
}

export async function getTrendingTopics(): Promise<{
  topics: Array<{label: string; type: string; count: number}>
}> {
  return request<{ topics: Array<{label: string; type: string; count: number}> }>(
    "/feed/trending-topics",
    { cache: "no-store" },
    "Failed to fetch topics"
  );
}

export async function getStoryArcs(): Promise<StoryArc[]> {
  return request<StoryArc[]>("/story-arcs/", { cache: "no-store" }, "Failed to fetch story arcs");
}
