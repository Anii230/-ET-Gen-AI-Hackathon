"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Brain, Check, ChevronRight, Compass, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CategoryTag } from "@/components/ui/category-tag";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getFeed, Article } from "@/lib/api";
import { cn, formatHeadline, pluralize, stripHtml } from "@/lib/utils";

function sentimentTone(label: string): string {
  if (label === "positive") return "bg-success";
  if (label === "negative") return "bg-destructive";
  return "bg-muted-foreground/50";
}

export default function NavigatorPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getFeed({ limit: 50 })
      .then((page) => {
        if (!cancelled) setArticles(page.articles);
      })
      .catch(() => {
        if (!cancelled) {
          setArticles([]);
          setError(
            "The story library could not be loaded. Check the connection and try again."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const categorizedArticles = useMemo(() => {
    const groups: Record<string, Article[]> = {};
    articles.forEach((article) => {
      const category = article.category || "General";
      if (!groups[category]) groups[category] = [];
      groups[category].push(article);
    });
    return groups;
  }, [articles]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSendToChat = () => {
    if (selectedIds.length === 0) return;
    const selectedArticles = articles.filter((article) =>
      selectedIds.includes(article.id)
    );
    const carry = {
      mode: "navigate",
      articleIds: selectedIds,
      topicSummary: `Selection of ${selectedIds.length} articles across ${
        new Set(selectedArticles.map((article) => article.category)).size
      } topics.`,
    };
    sessionStorage.setItem("et_navigator_selection", JSON.stringify(carry));
    router.push("/chat?mode=navigate");
  };

  return (
    <div className="mx-auto min-h-full w-full max-w-[1200px] px-4 pb-32 pt-6 sm:px-6 sm:pt-8">
      <header className="mb-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted">
            <Brain className="h-4 w-4 text-foreground" aria-hidden />
          </span>
          <h1 className="font-heading text-[24px] font-semibold tracking-tight text-foreground sm:text-[28px]">
            News Navigator
          </h1>
        </div>
        <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-muted-foreground">
          Select stories across different domains to build a custom
          topic-wise intelligence briefing.
        </p>
      </header>

      {loading ? (
        <div className="space-y-8">
          {Array.from({ length: 2 }).map((_, group) => (
            <section key={group} className="space-y-4">
              <Skeleton className="h-4 w-40" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-[168px] w-full rounded-xl" />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Story library unavailable"
          message={error}
          onRetry={() => {
            setLoading(true);
            setError(null);
            setReloadKey((key) => key + 1);
          }}
          retryLabel="Reload"
        />
      ) : articles.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No stories to navigate"
          description="The navigator needs ingested stories before you can build a selection."
        />
      ) : (
        <div className="space-y-9">
          {Object.entries(categorizedArticles).map(([category, items]) => (
            <section key={category} className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {category}
                  </h2>
                  <span className="text-[10.5px] tabular-nums text-muted-foreground/70">
                    {items.length} {pluralize(items.length, "story", "stories")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {items.map((article) => {
                  const isSelected = selectedIds.includes(article.id);
                  return (
                    <motion.button
                      key={article.id}
                      type="button"
                      onClick={() => toggleSelection(article.id)}
                      aria-pressed={isSelected}
                      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className={cn(
                        "relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        isSelected
                          ? "border-accent/40 bg-accent-soft"
                          : "border-border bg-card hover:border-border-hover"
                      )}
                    >
                      <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border transition-colors">
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full",
                            isSelected
                              ? "bg-accent text-white"
                              : "border border-border bg-background text-muted-foreground"
                          )}
                        >
                          {isSelected ? (
                            <Check className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </span>
                      </span>

                      <CategoryTag className="mr-10 self-start">
                        {article.source}
                      </CategoryTag>

                      <h3 className="line-clamp-2 pr-6 font-heading text-[14px] font-semibold leading-snug tracking-tight text-foreground">
                        {formatHeadline(article.headline)}
                      </h3>

                      {article.summary ? (
                        <p className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                          {stripHtml(article.summary)}
                        </p>
                      ) : null}

                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="text-[10.5px] text-muted-foreground">
                          {article.read_time || 3} min read
                        </span>
                        <span
                          aria-label={`Sentiment: ${article.sentiment_label}`}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            sentimentTone(article.sentiment_label)
                          )}
                        />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedIds.length > 0 ? (
          <motion.div
            initial={shouldReduceMotion ? {} : { y: 80, opacity: 0 }}
            animate={shouldReduceMotion ? {} : { y: 0, opacity: 1 }}
            exit={shouldReduceMotion ? {} : { y: 80, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-20 z-40 mx-auto w-full max-w-[520px] px-4 md:bottom-6"
          >
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-popover p-3 pl-4 shadow-popover">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Brain className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground">
                    {selectedIds.length}{" "}
                    {pluralize(selectedIds.length, "story", "stories")} selected
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Ready for topic-wise synthesis
                  </p>
                </div>
              </div>

              <Button size="lg" onClick={handleSendToChat} className="flex-shrink-0">
                Synthesise
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
