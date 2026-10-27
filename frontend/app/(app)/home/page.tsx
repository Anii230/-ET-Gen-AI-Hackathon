"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Loader2,
  Newspaper,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { FeedToggle } from "@/components/feed/FeedToggle";
import { BentoMonochrome } from "@/components/ui/bento-monochrome";
import { Button } from "@/components/ui/button";
import { CategoryTag } from "@/components/ui/category-tag";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { FeedSkeleton } from "@/components/ui/skeleton";
import { useFeed } from "@/lib/hooks/useFeed";
import { useFeedStore } from "@/lib/store";
import {
  hasOnboarded,
  usePreferencesStore,
} from "@/lib/store/preferences";
import { useCurrentUserId } from "@/lib/use-current-user";

export default function AppHomePage() {
  const user = useCurrentUserId();
  const activeTab = useFeedStore((state) => state.activeTab);
  const setActiveTab = useFeedStore((state) => state.setActiveTab);

  const categories = usePreferencesStore((state) => state.categories);
  const hydration = usePreferencesStore((state) => state.hydration);
  const hydrate = usePreferencesStore((state) => state.hydrate);
  const available = usePreferencesStore((state) => state.available);
  const openDialog = usePreferencesStore((state) => state.openDialog);
  const loadAvailable = usePreferencesStore((state) => state.loadAvailable);
  const lastSavedAt = usePreferencesStore((state) => state.lastSavedAt);
  const lastSavedReason = usePreferencesStore((state) => state.lastSavedReason);

  const { articles, status, error, hasMore, loadMore, retry, isInitialLoading } =
    useFeed({
      tab: activeTab,
      userId: user.userId,
      categories,
    });

  const [sentinelVisible, setSentinelVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const handledSave = useRef<number | null>(null);

  useEffect(() => {
    if (!user.ready) return;
    void hydrate(user.authenticated ? user.userId : null);
  }, [hydrate, user.authenticated, user.ready, user.userId]);

  useEffect(() => {
    void loadAvailable();
  }, [loadAvailable]);

  // First-use onboarding uses the same dialog as the Topbar and empty state.
  useEffect(() => {
    if (hydration !== "ready") return;
    if (categories.length > 0) return;
    if (hasOnboarded()) return;
    openDialog("onboarding");
  }, [categories.length, hydration, openDialog]);

  // Completing onboarding lands on For You. Later edits keep the current tab.
  useEffect(() => {
    if (!lastSavedAt || handledSave.current === lastSavedAt) return;
    handledSave.current = lastSavedAt;
    if (lastSavedReason === "onboarding") {
      setActiveTab("foryou");
    }
  }, [lastSavedAt, lastSavedReason, setActiveTab]);

  // Reset the reading position when the user intentionally switches tabs.
  // Appending a page never scrolls the list.
  useEffect(() => {
    const container = document.getElementById("app-content");
    if (!container) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    container.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [activeTab]);

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        setSentinelVisible(visible);
      },
      { rootMargin: "0px 0px 280px 0px", threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, articles.length]);

  const showLoadMore = hasMore && sentinelVisible;

  const labelsById = useMemo(() => {
    const map = new Map<string, string>();
    available.forEach((category) => map.set(category.id, category.label));
    return map;
  }, [available]);

  const selectedLabels = categories.map((id) => labelsById.get(id) ?? id);
  const preferencesReady = hydration === "ready";
  const isForYou = activeTab === "foryou";
  const waitingForPreferences = isForYou && !preferencesReady;
  const showArticles = articles.length > 0;
  const isLoadingFirstPage = waitingForPreferences || isInitialLoading;

  const handleTabChange = (tab: "general" | "foryou") => {
    setActiveTab(tab);
  };

  const renderEmpty = () => {
    if (isForYou && categories.length === 0) {
      return (
        <EmptyState
          icon={SlidersHorizontal}
          title="Choose what you follow"
          description="For You only shows the desks you select. It will stay empty until you choose at least one category — it never quietly falls back to General."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button size="lg" onClick={() => openDialog("edit")}>
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                Choose categories
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => handleTabChange("general")}
              >
                Browse General
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          }
        />
      );
    }

    if (isForYou) {
      return (
        <EmptyState
          icon={Sparkles}
          title="No stories in these categories yet"
          description={`You follow ${selectedLabels.join(", ")}. Nothing has been filed there yet, so For You is honestly empty rather than falling back to General.`}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button size="lg" onClick={() => openDialog("edit")}>
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                Edit preferences
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => handleTabChange("general")}
              >
                Browse General
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          }
        />
      );
    }

    return (
      <EmptyState
        icon={Newspaper}
        title="No stories yet"
        description="The newsroom has no articles in the General feed right now. Try again in a moment."
        action={
          <Button size="lg" variant="outline" onClick={retry}>
            Refresh feed
          </Button>
        }
      />
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-[24px] font-semibold tracking-tight text-foreground sm:text-[28px]">
              Today&apos;s Intelligence
            </h1>
            {isForYou ? (
              <CategoryTag className="border-accent/30 bg-accent-soft text-accent-soft-foreground">
                For You
              </CategoryTag>
            ) : null}
          </div>
          <p
            className="mt-1 text-[13px] text-muted-foreground"
            suppressHydrationWarning
          >
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {isForYou && categories.length > 0 ? (
              <>
                <span aria-hidden className="mx-1.5">
                  ·
                </span>
                {selectedLabels.slice(0, 3).join(", ")}
                {selectedLabels.length > 3
                  ? ` +${selectedLabels.length - 3} more`
                  : ""}
              </>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FeedToggle activeTab={activeTab} onChange={handleTabChange} />
          <Button
            variant="outline"
            size="lg"
            onClick={() => openDialog("edit")}
            aria-label="Edit For You preferences"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Preferences
          </Button>
        </div>
      </header>

      <p className="sr-only" role="status" aria-live="polite">
        {isLoadingFirstPage
          ? "Loading stories"
          : status === "loading-more"
            ? "Loading more stories"
            : status === "ready"
              ? `${articles.length} stories loaded`
              : ""}
      </p>

      <section
        id="feed-panel"
        role="tabpanel"
        aria-labelledby={`feed-tab-${activeTab}`}
        aria-busy={isLoadingFirstPage || status === "loading-more"}
        tabIndex={0}
        className="focus-visible:outline-none"
      >
        {isLoadingFirstPage ? (
          <FeedSkeleton count={6} />
        ) : status === "error" && !showArticles ? (
          <ErrorState
            title="The feed could not be loaded"
            message={error || "Please check your connection and try again."}
            onRetry={retry}
          />
        ) : !showArticles ? (
          renderEmpty()
        ) : (
          <>
            <BentoMonochrome
              articles={articles}
              preferredCategories={isForYou ? categories : undefined}
              categoryLabels={labelsById}
            />

            <div className="mt-6 flex flex-col items-center gap-3">
              {status === "error-more" && error ? (
                <div
                  role="alert"
                  className="flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-center"
                >
                  <p className="text-[12.5px] text-muted-foreground">{error}</p>
                  <Button size="lg" variant="outline" onClick={retry}>
                    Retry loading more
                  </Button>
                </div>
              ) : hasMore ? (
                <>
                  <div ref={sentinelRef} aria-hidden className="h-px w-full" />
                  {showLoadMore ? (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={loadMore}
                      disabled={status === "loading-more"}
                      aria-busy={status === "loading-more"}
                    >
                      {status === "loading-more" ? (
                        <>
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin"
                            aria-hidden
                          />
                          Loading more
                        </>
                      ) : (
                        "Load more stories"
                      )}
                    </Button>
                  ) : null}
                </>
              ) : (
                <p className="py-2 text-[12px] text-muted-foreground">
                  You&apos;re all caught up · {articles.length}{" "}
                  {articles.length === 1 ? "story" : "stories"}
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
