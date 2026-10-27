"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
  Loader2,
  MessageSquare,
  Minimize2,
  Send,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CategoryTag } from "@/components/ui/category-tag";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getTopicBriefing,
  getArticle,
  Article,
  TopicBriefing,
  ApiError,
  sendChatMessage,
} from "@/lib/api";
import { cn, formatHeadline, formatPublishedAt, stripHtml } from "@/lib/utils";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PREFIX = "[Context:";

export default function TopicPage() {
  const params = useParams<{ label: string }>();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const topicLabel = useMemo(() => {
    const raw = params?.label ?? "";
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params?.label]);

  const [briefing, setBriefing] = useState<TopicBriefing | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeAngle, setActiveAngle] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!topicLabel) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getTopicBriefing(topicLabel)
      .then(async (data) => {
        if (cancelled) return;
        setBriefing(data);
        setActiveAngle(0);
        setChatMessages([
          {
            role: "assistant",
            content: `I've analysed ${data.total_articles} ${
              data.total_articles === 1 ? "article" : "articles"
            } about “${topicLabel}”. What would you like to understand?`,
          },
        ]);

        const details = await Promise.all(
          data.article_ids
            .slice(0, 6)
            .map((articleId) => getArticle(articleId).catch(() => null))
        );
        if (cancelled) return;
        setArticles(details.filter((item): item is Article => item !== null));
      })
      .catch((e) => {
        if (cancelled) return;
        setBriefing(null);
        setArticles([]);
        setError(
          e instanceof ApiError
            ? e.message
            : "The topic briefing could not be loaded. Please try again."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [topicLabel]);

  async function handleTopicChat() {
    if (!chatInput.trim() || chatLoading) return;
    const message = chatInput;
    const angle = briefing?.angles[activeAngle]?.angle || "General";

    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: message }]);
    setChatLoading(true);

    try {
      const contextPrefix = `${SYSTEM_PREFIX} Topic "${topicLabel}", focusing on "${angle}". Top articles: ${articles
        .slice(0, 3)
        .map((article) => article.headline)
        .join("; ")}] `;
      const data = await sendChatMessage(
        "demo_user",
        contextPrefix + message,
        articles[0]?.id
      );
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (e) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            e instanceof ApiError
              ? e.message
              : "Sorry, I couldn't process that request.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-4 py-8 sm:px-6">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-6 h-8 w-2/3" />
        <Skeleton className="mt-2 h-3 w-56" />
        <div className="mt-8 flex gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <Skeleton className="mt-8 h-44 w-full rounded-xl" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !briefing) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-4 py-16 sm:px-6">
        <ErrorState
          title="Topic not available"
          message={
            error ||
            "This topic has no coverage yet. Try another search from the top bar."
          }
          onRetry={() => router.push("/home")}
          retryLabel="Back to the feed"
        />
      </div>
    );
  }

  const hasAngles = briefing.angles.length > 0;
  const angle = briefing.angles[activeAngle];

  return (
    <div className="relative mx-auto w-full max-w-[1000px] px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:pr-[460px]">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back
      </button>

      <header className="mb-6">
        <h1 className="text-balance font-heading text-[26px] font-semibold tracking-tight text-foreground sm:text-[30px]">
          {topicLabel}
        </h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {briefing.total_articles}{" "}
          {briefing.total_articles === 1 ? "story" : "stories"} analysed across{" "}
          {briefing.angles.length}{" "}
          {briefing.angles.length === 1 ? "perspective" : "perspectives"}
        </p>
      </header>

      {hasAngles ? (
        <div
          role="tablist"
          aria-label="Story angles"
          className="mb-6 flex flex-wrap gap-1.5"
        >
          {briefing.angles.map((item, index) => {
            const isActive = index === activeAngle;
            return (
              <button
                key={`${item.angle}-${index}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveAngle(index)}
                className={cn(
                  "cursor-pointer rounded-md border px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-accent/40 bg-accent-soft text-accent-soft-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:border-border-hover hover:text-foreground"
                )}
              >
                {item.angle}
              </button>
            );
          })}
        </div>
      ) : null}

      {angle ? (
        <section
          role="tabpanel"
          aria-label={angle.angle}
          className="mb-10 rounded-xl border border-border bg-card p-5 sm:p-7"
        >
          <div className="mb-4 flex items-center gap-2">
            <Sparkles
              className="h-3.5 w-3.5 text-accent-soft-foreground"
              aria-hidden
            />
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-soft-foreground">
              AI briefing · {angle.angle}
            </h2>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeAngle}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 6 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? {} : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <p className="whitespace-pre-line text-[14.5px] leading-[1.75] text-foreground/85">
                {angle.content}
              </p>
              {angle.article_count > 0 ? (
                <p className="mt-4 text-[11px] text-muted-foreground">
                  {angle.article_count}{" "}
                  {angle.article_count === 1 ? "story" : "stories"} support this
                  angle
                </p>
              ) : null}
            </motion.div>
          </AnimatePresence>

          {briefing.what_to_watch ? (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                What to watch
              </h3>
              <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                {briefing.what_to_watch}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Source reporting
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {articles.length} shown
          </span>
        </div>

        {articles.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No source articles yet"
            description="The briefing was generated, but the underlying stories could not be loaded. Try refreshing the topic."
          />
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {articles.map((article) => (
              <button
                key={article.id}
                type="button"
                onClick={() => router.push(`/home/article/${article.id}`)}
                className="group flex w-full cursor-pointer flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-border-hover hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center justify-between gap-2">
                  <CategoryTag>{article.category || "General"}</CategoryTag>
                  <span className="text-[10.5px] text-muted-foreground">
                    {formatPublishedAt(article.published_at)}
                  </span>
                </div>
                <h3 className="text-[14.5px] font-semibold leading-snug tracking-tight text-foreground group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                  {formatHeadline(article.headline)}
                </h3>
                <p className="line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                  {stripHtml(article.summary)}
                </p>
                <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  {article.source}
                  <ArrowUpRight className="h-3 w-3" aria-hidden />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {briefing.key_entities.length > 0 ? (
        <section className="mt-8 border-t border-border pt-6">
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Key entities
          </h2>
          <div className="flex flex-wrap gap-2">
            {briefing.key_entities.map((entity) => (
              <span
                key={entity}
                className="rounded-[5px] border border-border bg-tag px-2 py-1 text-[11px] text-tag-foreground"
              >
                {entity}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {!chatOpen ? (
        <Button
          onClick={() => setChatOpen(true)}
          variant="outline"
          size="lg"
          className="fixed bottom-20 right-4 z-40 shadow-popover md:bottom-6 md:right-6"
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
          Ask about this topic
        </Button>
      ) : (
        <div
          role="dialog"
          aria-label="Topic chat"
          className="fixed inset-x-3 bottom-20 z-40 flex h-[62vh] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-popover md:inset-x-auto md:bottom-6 md:right-6 md:h-[70vh] md:max-h-[680px] md:w-[400px]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground">
                Topic intelligence
              </p>
              <p className="line-clamp-1 text-[11px] text-muted-foreground">
                {topicLabel}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  router.push("/chat");
                }}
                aria-label="Open in full chat"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                aria-label="Minimise chat"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Minimize2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {chatMessages.map((message, index) => {
              if (message.content.startsWith(SYSTEM_PREFIX)) return null;
              const isUser = message.role === "user";
              return (
                <div
                  key={index}
                  className={cn("flex", isUser ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                      isUser
                        ? "rounded-br-sm bg-accent text-white"
                        : "rounded-bl-sm border border-border bg-muted/50 text-foreground"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              );
            })}
            {chatLoading ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl rounded-bl-sm border border-border bg-muted/50 px-3.5 py-2.5">
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin text-muted-foreground motion-reduce:animate-none"
                    aria-hidden
                  />
                  <span className="text-[12px] text-muted-foreground">
                    Thinking…
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <form
            className="mt-auto flex gap-2 border-t border-border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleTopicChat();
            }}
          >
            <label htmlFor="topic-chat-input" className="sr-only">
              Ask about this topic
            </label>
            <input
              id="topic-chat-input"
              type="text"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Ask about this topic…"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-ring/60 focus:outline-none focus:ring-2 focus:ring-ring/25"
            />
            <Button
              type="submit"
              size="icon-lg"
              disabled={chatLoading || !chatInput.trim()}
              aria-label="Send message"
            >
              {chatLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Send className="h-4 w-4" aria-hidden />
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
