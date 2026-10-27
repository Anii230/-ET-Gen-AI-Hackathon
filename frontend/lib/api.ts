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
  } catch (error) {
    // Aborts are control flow, not failures. Re-throw so callers can ignore
    // stale responses without surfacing a fake network error.
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
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
  categories?: string[];
  url: string;
  image_url?: string | null;
  published_at: string | null;
  read_time: number;
  sentiment_label: string;
  entities: string[];
  is_personalised: boolean;
};

/** One page of a cursor-paginated feed. */
export type FeedPage = {
  articles: Article[];
  has_more: boolean;
  next_cursor: string | null;
};

/** Canonical category with live article coverage. */
export type CategoryInfo = {
  id: string;
  label: string;
  article_count: number;
};

export type Profile = {
  user_id: string;
  category_weights: Record<string, number>;
  topic_preferences: string[];
  categories: string[];
};

export type FeedQuery = {
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
};

export type PersonalisedFeedQuery = FeedQuery & {
  userId?: string;
  /**
   * Canonical category IDs. Pass an explicit array (including an empty one)
   * to override saved preferences. Omit to let the backend read the profile.
   */
  categories?: string[];
};

function feedSearch(query: FeedQuery): string {
  const params = new URLSearchParams();
  if (query.limit) params.set("limit", String(query.limit));
  if (query.cursor) params.set("cursor", query.cursor);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function getFeed(query: FeedQuery = {}): Promise<FeedPage> {
  return request<FeedPage>(
    `/feed/${feedSearch(query)}`,
    { cache: "no-store", signal: query.signal },
    "Failed to fetch feed"
  );
}

export async function getPersonalisedFeed(
  query: PersonalisedFeedQuery = {}
): Promise<FeedPage> {
  const params = new URLSearchParams();
  params.set("user_id", query.userId || "demo_user");
  if (query.limit) params.set("limit", String(query.limit));
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.categories !== undefined) {
    // Empty string is meaningful: it asks the backend for an honest empty
    // page instead of silently treating the request as "no preference".
    params.set("categories", query.categories.join(","));
  }
  return request<FeedPage>(
    `/feed/personalised?${params.toString()}`,
    { cache: "no-store", signal: query.signal },
    "Failed to fetch personalised feed"
  );
}

export async function getCategories(
  options: { signal?: AbortSignal } = {}
): Promise<CategoryInfo[]> {
  const data = await request<{ categories: CategoryInfo[] }>(
    "/feed/categories",
    { cache: "no-store", signal: options.signal },
    "Failed to fetch categories"
  );
  return data.categories;
}

export async function getProfile(userId: string): Promise<Profile> {
  return request<Profile>(
    `/users/${encodeURIComponent(userId)}/profile`,
    { cache: "no-store" },
    "Failed to load your preferences"
  );
}

export async function getArticle(id: string): Promise<Article> {
  return request<Article>(
    `/articles/${encodeURIComponent(id)}`,
    { cache: "no-store" },
    "Article not found"
  );
}

export type BriefingResponse = {
  briefing: string;
  sources_used: string[];
  ranked_count: number;
  pipeline_steps: string[];
  degraded?: boolean;
  /** False when the provider stopped before the requested structure was done. */
  complete?: boolean;
  /** True when the response hit the output-token ceiling. */
  truncated?: boolean;
  /** Non-alarming explanation for an incomplete briefing. */
  notice?: string | null;
};

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

/**
 * Persist the canonical category selection.
 *
 * Returns the normalized IDs so the client can reconcile aliases/duplicates.
 */
export async function savePreferences(
  userId: string,
  categories: string[]
): Promise<{ categories: string[] }> {
  return request<{ categories: string[] }>(
    "/users/preferences",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, categories }),
    },
    "Your preferences could not be saved."
  );
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
  key_players: Array<{ name: string; mention_count: number }>;
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
  topics: Array<{ label: string; type: string; count: number }>;
}> {
  return request<{ topics: Array<{ label: string; type: string; count: number }> }>(
    "/feed/trending-topics",
    { cache: "no-store" },
    "Failed to fetch topics"
  );
}

export async function getStoryArcs(): Promise<StoryArc[]> {
  return request<StoryArc[]>(
    "/story-arcs/",
    { cache: "no-store" },
    "Failed to fetch story arcs"
  );
}
