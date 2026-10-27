import { describe, expect, it } from "vitest";

import type { Article, FeedPage } from "../lib/api";
import {
  createFeedState,
  dedupeArticles,
  feedReducer,
  type FeedState,
} from "../lib/feed-reducer";

function article(id: string, headline = `Story ${id}`): Article {
  return {
    id,
    headline,
    summary: "",
    source: "Test Wire",
    category: "Technology",
    categories: ["technology"],
    url: `https://example.test/${id}`,
    published_at: null,
    read_time: 2,
    sentiment_label: "neutral",
    entities: [],
    is_personalised: false,
  };
}

function page(ids: string[], next: string | null = null): FeedPage {
  return {
    articles: ids.map((id) => article(id)),
    has_more: Boolean(next),
    next_cursor: next,
  };
}

function begin(
  state: FeedState,
  tab: "general" | "foryou",
  fingerprint: string,
  requestId: number,
  append = false
) {
  return feedReducer(state, {
    type: "begin",
    tab,
    fingerprint,
    requestId,
    append,
  });
}

function succeed(
  state: FeedState,
  tab: "general" | "foryou",
  fingerprint: string,
  requestId: number,
  payload: FeedPage,
  append = false
) {
  return feedReducer(state, {
    type: "success",
    tab,
    fingerprint,
    requestId,
    page: payload,
    append,
  });
}

describe("feed reducer", () => {
  it("starts empty and idle for both tabs", () => {
    const state = createFeedState();
    expect(state.general.status).toBe("idle");
    expect(state.foryou.status).toBe("idle");
    expect(state.general.articles).toEqual([]);
  });

  it("replaces articles on the first page", () => {
    let state = createFeedState();
    state = begin(state, "general", "general", 1);
    expect(state.general.status).toBe("loading");

    state = succeed(state, "general", "general", 1, page(["a", "b"], "c1"));
    expect(state.general.status).toBe("ready");
    expect(state.general.articles.map((a) => a.id)).toEqual(["a", "b"]);
    expect(state.general.cursor).toBe("c1");
    expect(state.general.hasMore).toBe(true);
  });

  it("appends the next page and dedupes overlapping articles", () => {
    let state = createFeedState();
    state = begin(state, "general", "general", 1);
    state = succeed(state, "general", "general", 1, page(["a", "b"], "c1"));

    state = begin(state, "general", "general", 2, true);
    expect(state.general.status).toBe("loading-more");
    expect(state.general.articles).toHaveLength(2);

    state = succeed(
      state,
      "general",
      "general",
      2,
      page(["b", "c", "c"], "c2"),
      true
    );
    expect(state.general.articles.map((a) => a.id)).toEqual(["a", "b", "c"]);
    expect(state.general.cursor).toBe("c2");
    expect(state.general.status).toBe("ready");
  });

  it("ignores a stale response from an older request", () => {
    let state = createFeedState();
    state = begin(state, "general", "general", 1);
    state = begin(state, "general", "general", 2);
    state = succeed(state, "general", "general", 1, page(["stale"]));

    expect(state.general.articles).toEqual([]);
    expect(state.general.status).toBe("loading");
  });

  it("ignores a response for a different filter fingerprint", () => {
    let state = createFeedState();
    state = begin(state, "foryou", "foryou:technology", 1);
    state = begin(state, "foryou", "foryou:sports", 2);
    state = succeed(
      state,
      "foryou",
      "foryou:technology",
      1,
      page(["stale"])
    );

    expect(state.foryou.fingerprint).toBe("foryou:sports");
    expect(state.foryou.articles).toEqual([]);
  });

  it("clears the previous list when the filter changes", () => {
    let state = createFeedState();
    state = begin(state, "foryou", "foryou:technology", 1);
    state = succeed(state, "foryou", "foryou:technology", 1, page(["a"]));

    state = begin(state, "foryou", "foryou:sports", 2);
    expect(state.foryou.articles).toEqual([]);
    expect(state.foryou.cursor).toBeNull();
    expect(state.foryou.status).toBe("loading");
  });

  it("does not leak one tab's state into the other", () => {
    let state = createFeedState();
    state = begin(state, "general", "general", 1);
    state = succeed(state, "general", "general", 1, page(["a", "b"], "c1"));
    state = begin(state, "foryou", "foryou:technology", 2);
    state = succeed(state, "foryou", "foryou:technology", 2, page(["x"]));

    expect(state.general.articles.map((a) => a.id)).toEqual(["a", "b"]);
    expect(state.foryou.articles.map((a) => a.id)).toEqual(["x"]);
    expect(state.general.cursor).toBe("c1");
    expect(state.foryou.cursor).toBeNull();
  });

  it("keeps existing articles when loading more fails and allows retry", () => {
    let state = createFeedState();
    state = begin(state, "general", "general", 1);
    state = succeed(state, "general", "general", 1, page(["a"], "c1"));
    state = begin(state, "general", "general", 2, true);

    state = feedReducer(state, {
      type: "failure",
      tab: "general",
      fingerprint: "general",
      requestId: 2,
      message: "Network down",
      append: true,
    });

    expect(state.general.status).toBe("error-more");
    expect(state.general.error).toBe("Network down");
    expect(state.general.articles.map((a) => a.id)).toEqual(["a"]);
    expect(state.general.hasMore).toBe(true);
  });

  it("reports an initial load failure without inventing articles", () => {
    let state = createFeedState();
    state = begin(state, "foryou", "foryou:", 1);
    state = feedReducer(state, {
      type: "failure",
      tab: "foryou",
      fingerprint: "foryou:",
      requestId: 1,
      message: "Backend unavailable",
      append: false,
    });

    expect(state.foryou.status).toBe("error");
    expect(state.foryou.articles).toEqual([]);
    expect(state.foryou.loadedOnce).toBe(true);
  });

  it("reset invalidates in-flight requests", () => {
    let state = createFeedState();
    state = begin(state, "foryou", "foryou:technology", 1);
    state = feedReducer(state, {
      type: "reset",
      tab: "foryou",
      fingerprint: "foryou:sports",
    });
    state = succeed(
      state,
      "foryou",
      "foryou:technology",
      1,
      page(["stale"])
    );

    expect(state.foryou.fingerprint).toBe("foryou:sports");
    expect(state.foryou.articles).toEqual([]);
  });

  it("treats has_more without a cursor as the end", () => {
    let state = createFeedState();
    state = begin(state, "general", "general", 1);
    state = succeed(state, "general", "general", 1, {
      articles: [article("a")],
      has_more: true,
      next_cursor: null,
    });

    expect(state.general.hasMore).toBe(false);
    expect(state.general.cursor).toBeNull();
  });

  it("dedupeArticles preserves order and drops repeats", () => {
    const result = dedupeArticles([
      article("a"),
      article("b"),
      article("a"),
      article("c"),
    ]);
    expect(result.map((a) => a.id)).toEqual(["a", "b", "c"]);
  });
});
