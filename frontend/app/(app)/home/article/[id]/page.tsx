"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Clock,
  ExternalLink,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CategoryTag } from "@/components/ui/category-tag";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getArticle,
  getBriefing,
  ApiError,
  Article,
  sendChatMessage,
} from "@/lib/api";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";
import { cn, formatHeadline, formatPublishedAt, stripHtml } from "@/lib/utils";

type ChatMessage = { role: "user" | "assistant"; content: string };

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^- /gm, "• ")
    .replace(/^#{1,6} /gm, "")
    .trim();
}

function ArticleSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[780px] px-4 py-8 sm:px-6">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-5 h-3 w-24" />
      <Skeleton className="mt-3 h-9 w-11/12" />
      <Skeleton className="mt-2 h-9 w-2/3" />
      <Skeleton className="mt-6 h-3 w-56" />
      <div className="mt-8 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <Skeleton className="mt-10 h-32 w-full rounded-xl" />
    </div>
  );
}

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  const [briefing, setBriefing] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingDegraded, setBriefingDegraded] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getArticle(id)
      .then((data) => {
        if (!cancelled) setArticle(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setArticle(null);
        setError(
          e instanceof ApiError
            ? e.message
            : "The article could not be loaded. Please try again."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (article) setBookmarked(isBookmarked(article.id));
  }, [article]);

  useEffect(() => {
    if (!article) return;
    let cancelled = false;
    setBriefingLoading(true);
    getBriefing("demo_user", undefined, [article.id])
      .then((data) => {
        if (cancelled) return;
        setBriefing(data.briefing);
        setBriefingDegraded(Boolean(data.degraded));
      })
      .catch(() => {
        if (cancelled) return;
        setBriefing("");
        setBriefingDegraded(false);
      })
      .finally(() => {
        if (!cancelled) setBriefingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [article]);

  async function handleArticleChat() {
    if (!chatInput.trim() || chatLoading || !article) return;
    const message = chatInput;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: message }]);
    setChatLoading(true);
    try {
      const data = await sendChatMessage("demo_user", message, article.id);
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
              : "The assistant is unavailable right now. Please try again.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function openChat() {
    setChatOpen(true);
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          role: "assistant",
          content: "I'm ready to discuss this article. What would you like to know?",
        },
      ]);
    }
  }

  if (loading) return <ArticleSkeleton />;

  if (error || !article) {
    return (
      <div className="mx-auto w-full max-w-[780px] px-4 py-16 sm:px-6">
        <ErrorState
          title="Article not found"
          message={error || "This story is no longer available."}
          onRetry={() => router.push("/home")}
          retryLabel="Back to the feed"
        />
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-[820px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back
      </button>

      <div className="flex flex-wrap items-center gap-2">
        <CategoryTag>{article.category || "General"}</CategoryTag>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" aria-hidden />
          {article.read_time || 3} min read
        </span>
      </div>

      <h1 className="mt-4 text-balance font-heading text-[26px] font-semibold leading-[1.2] tracking-tight text-foreground sm:text-[32px]">
        {formatHeadline(article.headline)}
      </h1>

      <div className="mt-4 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[12.5px] text-muted-foreground">
          {article.source}
          <span aria-hidden className="mx-1.5">
            ·
          </span>
          <time dateTime={article.published_at ?? undefined}>
            {formatPublishedAt(article.published_at)}
          </time>
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="lg"
            aria-pressed={bookmarked}
            onClick={() => setBookmarked(toggleBookmark(article.id))}
            className={cn(
              bookmarked && "border-accent/40 bg-accent-soft text-accent-soft-foreground"
            )}
          >
            <Bookmark
              className={cn("h-3.5 w-3.5", bookmarked && "fill-current")}
              aria-hidden
            />
            {bookmarked ? "Saved" : "Save"}
          </Button>
          {article.url ? (
            <Button asChild variant="ghost" size="lg">
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                Read full article
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {article.summary ? (
        <p className="mt-6 text-[15.5px] leading-[1.75] text-foreground/85">
          {stripHtml(article.summary)}
        </p>
      ) : null}

      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-accent-soft-foreground" aria-hidden />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-soft-foreground">
            AI briefing
          </h2>
        </div>
        {briefingLoading ? (
          <div className="space-y-2" role="status" aria-label="Generating briefing">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        ) : briefing ? (
          briefingDegraded ? (
            <p className="text-[13px] text-muted-foreground">
              The AI briefing is unavailable right now. The article itself is
              unchanged — try again in a few minutes.
            </p>
          ) : (
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-foreground/85">
              {renderMarkdown(briefing)}
            </p>
          )
        ) : (
          <p className="text-[13px] text-muted-foreground">
            No briefing is available for this story yet.
          </p>
        )}
      </section>

      <div className="mt-4">
        <Button variant="outline" size="lg" onClick={openChat}>
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
          Discuss in chat
        </Button>
      </div>

      {article.entities && article.entities.length > 0 ? (
        <section className="mt-8 border-t border-border pt-6">
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Key entities
          </h2>
          <div className="flex flex-wrap gap-2">
            {article.entities.map((entity) => (
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

      {chatOpen ? (
        <div
          role="dialog"
          aria-label="Discuss this article"
          className="fixed inset-x-3 bottom-3 z-50 flex h-[70vh] max-h-[680px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-popover sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[70vh] sm:w-[400px]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground">
                Article chat
              </p>
              <p className="line-clamp-1 text-[11px] text-muted-foreground">
                {formatHeadline(article.headline)}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.setItem(
                      "et_chat_carry",
                      JSON.stringify({
                        articleId: article.id,
                        headline: article.headline,
                        messages: chatMessages,
                      })
                    );
                  } catch {
                    // Ignore storage failures; the chat still opens fresh.
                  }
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
                aria-label="Close chat"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {chatMessages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={i}
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
                    {msg.content}
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
                  <span className="text-[12px] text-muted-foreground">Thinking…</span>
                </div>
              </div>
            ) : null}
          </div>

          <form
            className="mt-auto flex gap-2 border-t border-border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleArticleChat();
            }}
          >
            <label htmlFor="article-chat-input" className="sr-only">
              Ask about this article
            </label>
            <input
              id="article-chat-input"
              type="text"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Ask about this article…"
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
      ) : null}
    </div>
  );
}
