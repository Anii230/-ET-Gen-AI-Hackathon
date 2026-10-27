"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Clock,
  ExternalLink,
  Info,
  MessageSquare,
  Sparkles,
} from "lucide-react";

import { ChatPanel, type ChatMessage } from "@/components/chat/ChatPanel";
import { Markdown } from "@/components/markdown/Markdown";
import { PageContainer } from "@/components/layout/PageContainer";
import { ArticleThumbnail } from "@/components/ui/article-thumbnail";
import { Button } from "@/components/ui/button";
import { CategoryTag } from "@/components/ui/category-tag";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getArticle,
  getBriefing,
  ApiError,
  type Article,
  sendChatMessage,
} from "@/lib/api";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";
import { cn, formatHeadline, formatPublishedAt, stripHtml } from "@/lib/utils";

const INCOMPLETE_NOTICE =
  "This briefing was cut short before it finished, so some sections may be missing.";

function ArticleSkeleton() {
  return (
    <PageContainer width="reading" className="py-8">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-5 h-3 w-24" />
      <Skeleton className="mt-3 h-9 w-11/12 max-w-[820px]" />
      <Skeleton className="mt-2 h-9 w-2/3 max-w-[620px]" />
      <Skeleton className="mt-6 h-3 w-56" />
      <Skeleton className="mt-4 h-9 w-72 rounded-lg" />
      <Skeleton className="mt-8 aspect-[2/1] w-full max-w-[860px] rounded-xl" />
      <div className="mt-8 max-w-[820px] space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <Skeleton className="mt-10 h-32 w-full max-w-[820px] rounded-xl" />
    </PageContainer>
  );
}

export function ArticleReader({ articleId }: { articleId: string }) {
  const router = useRouter();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  const [briefing, setBriefing] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingDegraded, setBriefingDegraded] = useState(false);
  const [briefingFailed, setBriefingFailed] = useState(false);
  const [briefingComplete, setBriefingComplete] = useState(true);
  const [briefingTruncated, setBriefingTruncated] = useState(false);
  const [briefingNotice, setBriefingNotice] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!articleId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setArticle(null);
    setChatOpen(false);
    setChatMessages([]);
    setChatInput("");
    getArticle(articleId)
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
  }, [articleId]);

  useEffect(() => {
    if (article) setBookmarked(isBookmarked(article.id));
  }, [article]);

  useEffect(() => {
    if (!article) return;
    let cancelled = false;
    setBriefing("");
    setBriefingLoading(true);
    setBriefingDegraded(false);
    setBriefingFailed(false);
    setBriefingComplete(true);
    setBriefingTruncated(false);
    setBriefingNotice(null);

    getBriefing("demo_user", undefined, [article.id])
      .then((data) => {
        if (cancelled) return;
        setBriefing(data.briefing || "");
        setBriefingDegraded(Boolean(data.degraded));
        setBriefingComplete(data.complete ?? !data.degraded);
        setBriefingTruncated(Boolean(data.truncated));
        setBriefingNotice(data.notice ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setBriefing("");
        setBriefingFailed(true);
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
          content:
            "I'm ready to discuss this article. What would you like to know?",
        },
      ]);
    }
  }

  function openFullChat() {
    if (!article) return;
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
  }

  if (loading) return <ArticleSkeleton />;

  if (error || !article) {
    return (
      <PageContainer width="narrow" className="py-16">
        <ErrorState
          title="Article not found"
          message={error || "This story is no longer available."}
          onRetry={() => router.push("/home")}
          retryLabel="Back to the feed"
        />
      </PageContainer>
    );
  }

  const briefingIncomplete =
    Boolean(briefing) &&
    !briefingDegraded &&
    !briefingFailed &&
    (!briefingComplete || briefingTruncated);

  return (
    <PageContainer width="reading" className="pb-16 pt-6 sm:pt-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back
      </button>

      <article>
        <header className="max-w-[880px]">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryTag>{article.category || "General"}</CategoryTag>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden />
              {article.read_time || 3} min read
            </span>
          </div>

          <h1 className="mt-4 text-balance font-heading text-[27px] font-semibold leading-[1.18] tracking-tight text-foreground sm:text-[34px]">
            {formatHeadline(article.headline)}
          </h1>

          <div className="mt-4 border-b border-border pb-5">
            <p className="text-[12.5px] text-muted-foreground">
              {article.source}
              <span aria-hidden className="mx-1.5">
                ·
              </span>
              <time dateTime={article.published_at ?? undefined}>
                {formatPublishedAt(article.published_at)}
              </time>
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="lg"
                aria-pressed={bookmarked}
                onClick={() => setBookmarked(toggleBookmark(article.id))}
                className={cn(
                  bookmarked &&
                    "border-accent/40 bg-accent-soft text-accent-soft-foreground"
                )}
              >
                <Bookmark
                  className={cn("h-3.5 w-3.5", bookmarked && "fill-current")}
                  aria-hidden
                />
                Save
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={openChat}
                aria-expanded={chatOpen}
                aria-controls={chatOpen ? "article-chat-panel" : undefined}
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                Discuss in Chat
              </Button>

              {article.url ? (
                <Button asChild size="lg">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Read Full Article
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </header>

        {article.image_url ? (
          <div className="relative mt-6 aspect-[2/1] w-full max-w-[880px] overflow-hidden rounded-xl border border-border">
            <ArticleThumbnail
              src={article.image_url}
              alt={formatHeadline(article.headline)}
              sizes="(min-width: 1400px) 820px, 100vw"
              priority
            />
          </div>
        ) : null}

        <div
          className={cn(
            "mt-8 grid items-start gap-6",
            chatOpen &&
              "lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_400px]"
          )}
        >
          {chatOpen ? (
            <ChatPanel
              title="Article chat"
              subtitle={formatHeadline(article.headline)}
              messages={chatMessages}
              loading={chatLoading}
              input={chatInput}
              onInputChange={setChatInput}
              onSend={() => void handleArticleChat()}
              onClose={() => setChatOpen(false)}
              onOpenFull={openFullChat}
              inputId="article-chat-input"
              placeholder="Ask about this article…"
              className="order-first h-[min(64vh,520px)] lg:order-last lg:sticky lg:top-4"
            />
          ) : null}

          <div className="min-w-0 max-w-[820px]">
            {article.summary ? (
              <p className="text-[16px] leading-[1.75] text-foreground/85">
                {stripHtml(article.summary)}
              </p>
            ) : null}

            <section className="mt-8 rounded-xl border border-border bg-card p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles
                  className="h-3.5 w-3.5 text-accent-soft-foreground"
                  aria-hidden
                />
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-soft-foreground">
                  AI briefing
                </h2>
              </div>

              {briefingLoading ? (
                <div
                  className="space-y-2"
                  role="status"
                  aria-label="Generating briefing"
                >
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-11/12" />
                  <Skeleton className="h-3.5 w-3/4" />
                </div>
              ) : briefingDegraded || briefingFailed ? (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  The AI briefing is unavailable right now. The article itself
                  is unchanged — please try again in a few minutes.
                </p>
              ) : briefing ? (
                <>
                  <Markdown
                    content={briefing}
                    className="text-[14px] text-foreground/90"
                  />
                  {briefingIncomplete ? (
                    <p className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] leading-relaxed text-foreground/80">
                      <Info
                        className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-warning"
                        aria-hidden
                      />
                      <span>{briefingNotice || INCOMPLETE_NOTICE}</span>
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  No briefing is available for this story yet.
                </p>
              )}
            </section>

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
          </div>
        </div>
      </article>
    </PageContainer>
  );
}
