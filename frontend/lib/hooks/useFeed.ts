"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  ApiError,
  getFeed,
  getPersonalisedFeed,
  type FeedPage,
} from "@/lib/api";
import {
  createFeedState,
  feedReducer,
  type FeedTab,
} from "@/lib/feed-reducer";

export const FEED_PAGE_SIZE = 12;

export function feedFingerprint(
  tab: FeedTab,
  userId: string,
  categoriesKey: string
): string {
  return tab === "general" ? "general" : `foryou:${userId}:${categoriesKey}`;
}

type UseFeedOptions = {
  tab: FeedTab;
  userId: string;
  categories: string[];
};

export function useFeed({ tab, userId, categories }: UseFeedOptions) {
  const [state, dispatch] = useReducer(
    feedReducer,
    undefined,
    createFeedState
  );

  const categoriesKey = categories.join(",");
  const fingerprint = feedFingerprint(tab, userId, categoriesKey);
  const enabled = tab === "general" || categories.length > 0;

  const stateRef = useRef(state);
  const queryRef = useRef({ tab, userId, categories, fingerprint });

  const requestCounter = useRef(0);
  const controllers = useRef<Record<FeedTab, AbortController | null>>({
    general: null,
    foryou: null,
  });

  // Keep the async callbacks in sync with the latest render without writing
  // to refs during render (which React's compiler rule forbids).
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    queryRef.current = { tab, userId, categories, fingerprint };
  }, [tab, userId, categories, fingerprint]);

  const fetchPage = useCallback(async (append: boolean) => {
    const query = queryRef.current;
    const activeTab = query.tab;
    const requestId = ++requestCounter.current;

    controllers.current[activeTab]?.abort();
    const controller = new AbortController();
    controllers.current[activeTab] = controller;

    const cursor = append ? stateRef.current[activeTab].cursor : null;

    dispatch({
      type: "begin",
      tab: activeTab,
      fingerprint: query.fingerprint,
      requestId,
      append,
    });

    try {
      let page: FeedPage;
      if (activeTab === "general") {
        page = await getFeed({
          limit: FEED_PAGE_SIZE,
          cursor,
          signal: controller.signal,
        });
      } else {
        page = await getPersonalisedFeed({
          userId: query.userId,
          categories: query.categories,
          limit: FEED_PAGE_SIZE,
          cursor,
          signal: controller.signal,
        });
      }

      dispatch({
        type: "success",
        tab: activeTab,
        fingerprint: query.fingerprint,
        requestId,
        page,
        append,
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      const message =
        error instanceof ApiError
          ? error.message
          : "The feed could not be loaded. Please try again.";
      dispatch({
        type: "failure",
        tab: activeTab,
        fingerprint: query.fingerprint,
        requestId,
        message,
        append,
      });
    }
  }, []);

  // Load the first page when the tab, user, or filter changes. A completed
  // tab keeps its own articles and cursor, so switching back does not refetch
  // or jump the reading position.
  useEffect(() => {
    if (!enabled) return;
    const current = stateRef.current[tab];
    if (current.fingerprint === fingerprint) {
      if (current.loadedOnce) return;
      if (current.status === "loading" || current.status === "loading-more") {
        return;
      }
    }
    void fetchPage(false);
  }, [enabled, fingerprint, tab, fetchPage]);

  // An empty explicit selection is a real empty state. Drop any previous For
  // You articles so they cannot leak across a preference change.
  useEffect(() => {
    if (tab !== "foryou" || enabled) return;
    dispatch({ type: "reset", tab: "foryou", fingerprint });
  }, [enabled, fingerprint, tab]);

  useEffect(() => {
    const activeControllers = controllers.current;
    return () => {
      activeControllers.general?.abort();
      activeControllers.foryou?.abort();
    };
  }, []);

  const loadMore = useCallback(() => {
    const current = stateRef.current[queryRef.current.tab];
    if (current.status === "loading" || current.status === "loading-more") {
      return;
    }
    if (!current.hasMore || !current.cursor) return;
    void fetchPage(true);
  }, [fetchPage]);

  const retry = useCallback(() => {
    const current = stateRef.current[queryRef.current.tab];
    const append = current.status === "error-more";
    void fetchPage(append);
  }, [fetchPage]);

  const refresh = useCallback(() => {
    void fetchPage(false);
  }, [fetchPage]);

  const current = state[tab];
  const isStale = current.fingerprint !== fingerprint;
  const articles = isStale ? [] : current.articles;
  const status = !enabled ? "idle" : isStale ? "loading" : current.status;
  const hasMore = isStale ? false : current.hasMore;
  const error = isStale ? null : current.error;

  return {
    articles,
    status,
    error,
    hasMore,
    fingerprint,
    isInitialLoading: status === "loading" && articles.length === 0,
    isLoadingMore: status === "loading-more",
    loadMore,
    retry,
    refresh,
  };
}
