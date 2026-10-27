import type { Article, FeedPage } from "./api";

export type FeedTab = "general" | "foryou";

export type FeedStatus =
  | "idle"
  | "loading"
  | "ready"
  | "loading-more"
  | "error"
  | "error-more";

export type TabFeedState = {
  /** Identifies the tab + filters + user that produced this state. */
  fingerprint: string;
  /** Latest request allowed to write into this tab. */
  requestId: number;
  status: FeedStatus;
  articles: Article[];
  cursor: string | null;
  hasMore: boolean;
  error: string | null;
  loadedOnce: boolean;
};

export type FeedState = Record<FeedTab, TabFeedState>;

export type FeedAction =
  | {
      type: "begin";
      tab: FeedTab;
      fingerprint: string;
      requestId: number;
      append: boolean;
    }
  | {
      type: "success";
      tab: FeedTab;
      fingerprint: string;
      requestId: number;
      page: FeedPage;
      append: boolean;
    }
  | {
      type: "failure";
      tab: FeedTab;
      fingerprint: string;
      requestId: number;
      message: string;
      append: boolean;
    }
  | { type: "reset"; tab: FeedTab; fingerprint: string };

export function initialTabState(fingerprint = ""): TabFeedState {
  return {
    fingerprint,
    requestId: 0,
    status: "idle",
    articles: [],
    cursor: null,
    hasMore: false,
    error: null,
    loadedOnce: false,
  };
}

export function createFeedState(): FeedState {
  return {
    general: initialTabState(),
    foryou: initialTabState(),
  };
}

/** Keep the first occurrence of each article ID, preserving feed order. */
export function dedupeArticles(articles: Article[]): Article[] {
  const seen = new Set<string>();
  const result: Article[] = [];
  for (const article of articles) {
    if (seen.has(article.id)) continue;
    seen.add(article.id);
    result.push(article);
  }
  return result;
}

function isCurrent(
  state: TabFeedState,
  action: { fingerprint: string; requestId: number }
): boolean {
  return (
    state.fingerprint === action.fingerprint &&
    state.requestId === action.requestId
  );
}

export function feedReducer(state: FeedState, action: FeedAction): FeedState {
  const current = state[action.tab];

  switch (action.type) {
    case "reset": {
      // Bump the request id so any in-flight response is ignored.
      return {
        ...state,
        [action.tab]: {
          ...initialTabState(action.fingerprint),
          requestId: current.requestId + 1,
        },
      };
    }

    case "begin": {
      const filterChanged = current.fingerprint !== action.fingerprint;
      const base = filterChanged
        ? initialTabState(action.fingerprint)
        : current;

      return {
        ...state,
        [action.tab]: {
          ...base,
          fingerprint: action.fingerprint,
          requestId: action.requestId,
          status:
            action.append && base.articles.length > 0
              ? "loading-more"
              : "loading",
          error: null,
        },
      };
    }

    case "success": {
      if (!isCurrent(current, action)) return state;

      const incoming = dedupeArticles(action.page.articles);
      const articles = action.append
        ? dedupeArticles([...current.articles, ...incoming])
        : incoming;
      const hasMore = Boolean(action.page.has_more && action.page.next_cursor);

      return {
        ...state,
        [action.tab]: {
          ...current,
          status: "ready",
          articles,
          cursor: action.page.next_cursor,
          hasMore,
          error: null,
          loadedOnce: true,
        },
      };
    }

    case "failure": {
      if (!isCurrent(current, action)) return state;

      return {
        ...state,
        [action.tab]: {
          ...current,
          status: action.append ? "error-more" : "error",
          error: action.message,
          loadedOnce: true,
        },
      };
    }

    default:
      return state;
  }
}
