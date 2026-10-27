"use client";

import { Suspense, useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SendHorizonal, TrendingUp, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { CategoryTag } from "@/components/ui/category-tag";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { sendChatMessage, getBriefing, getFeed, ApiError, Article } from "@/lib/api";
import { cn, formatHeadline } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Article[];
};

function SourcesAccordion({ sources }: { sources: Article[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span>
          {sources.length} {sources.length === 1 ? "source" : "sources"}
        </span>
        <span
          aria-hidden
          className={cn(
            "transition-transform duration-200",
            open && "rotate-180"
          )}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="divide-y divide-border border-t border-border">
          {sources.map((source) => (
            <Link
              key={source.id}
              href={`/home/article/${source.id}`}
              className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <CategoryTag className="flex-shrink-0">
                {source.category}
              </CategoryTag>
              <p className="line-clamp-1 flex-1 text-[12px] leading-snug text-foreground">
                {formatHeadline(source.headline) || "Reference article"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const InlineMarkdown = ({ text }: { text: string }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      })}
    </>
  );
};

const Markdown = ({ content }: { content: string }) => {
  if (!content) return null;

  const lines = content.split("\n");

  return (
    <div className="space-y-3">
      {lines.map((line, idx) => {
        if (line.startsWith("### ")) {
          return (
            <h3
              key={idx}
              className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground first:mt-0"
            >
              {line.replace("### ", "")}
            </h3>
          );
        }

        if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
          const text = line.trim().substring(2);
          return (
            <div key={idx} className="flex gap-2 pl-1">
              <div
                aria-hidden
                className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground/60"
              />
              <p className="flex-1 text-[13.5px] leading-relaxed text-foreground/90">
                <InlineMarkdown text={text} />
              </p>
            </div>
          );
        }

        if (line.trim() === "") return <div key={idx} className="h-1" />;

        return (
          <p key={idx} className="text-[13.5px] leading-relaxed text-foreground/90">
            <InlineMarkdown text={line} />
          </p>
        );
      })}
    </div>
  );
};

function ChatSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-3 w-56" />
      </div>
      <div className="flex-1 space-y-5 px-6 py-6">
        <Skeleton className="h-20 w-4/5" />
        <Skeleton className="ml-auto h-12 w-1/2" />
        <Skeleton className="h-28 w-3/4" />
      </div>
    </div>
  );
}

function ChatPageInner() {
  const shouldReduceMotion = useReducedMotion();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! Ask me anything about today's news. I can give you briefings, explain market moves, or dig into any story.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextArticleId, setContextArticleId] = useState<string | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [carried, setCarried] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("et_chat_carry");
      if (raw) {
        const ctx = JSON.parse(raw);
        sessionStorage.removeItem("et_chat_carry");
        if (ctx.messages?.length > 0) {
          setMessages(ctx.messages);
        }
        if (ctx.articleId) {
          setContextArticleId(ctx.articleId);
        }
        setCarried(true);
      }
    } catch {
      // Ignore malformed session payloads.
    }
  }, []);

  useEffect(() => {
    if (carried) return;

    const mode = searchParams.get("mode");
    if (mode === "navigate") {
      const raw = sessionStorage.getItem("et_navigator_selection");
      if (raw) {
        try {
          const selection = JSON.parse(raw);
          sessionStorage.removeItem("et_navigator_selection");
          if (selection.articleIds?.length > 0) {
            void handleAutoSynthesis(selection.articleIds);
            return;
          }
        } catch {
          // Ignore malformed selection payloads.
        }
      }
    }

    const articleId = searchParams.get("articleId");
    const headline = searchParams.get("headline");
    if (articleId && headline) {
      const decodedHeadline = decodeURIComponent(headline);
      setMessages([
        {
          role: "assistant",
          content: `I'm ready to discuss this article:\n\n**${decodedHeadline}**\n\nWhat would you like to know? I can explain the key points, provide context, or answer specific questions.`,
        },
      ]);
      setContextArticleId(articleId);
    }
    // handleAutoSynthesis is defined below and only runs for a navigator
    // selection, so the effect intentionally keys on the search params.
  }, [searchParams, carried]);

  async function handleAutoSynthesis(ids: string[]) {
    setLoading(true);
    setMessages([
      {
        role: "assistant",
        content: "Initialising your topic-wise intelligence briefing…",
      },
    ]);

    try {
      const data = await getBriefing("demo_user", "TOPIC_WISE_SUMMARY", ids);
      const page = await getFeed({ limit: 50 });
      const sources = page.articles.filter((article) =>
        data.sources_used.includes(article.id)
      );

      setMessages([
        {
          role: "assistant",
          content: data.briefing,
          sources,
        },
      ]);
    } catch (e) {
      setMessages([
        {
          role: "assistant",
          content:
            e instanceof ApiError
              ? e.message
              : "Sorry, I couldn't synthesize your news selection. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    getFeed({ limit: 3 })
      .then((page) => {
        if (!cancelled) setRelatedArticles(page.articles.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRelatedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);
    try {
      const data = await sendChatMessage(
        "demo_user",
        userMessage,
        contextArticleId || undefined
      );
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          sources: data.sources,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            e instanceof ApiError
              ? e.message
              : "Sorry, I had trouble connecting. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full">
      {/* ── Conversation ─────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col border-r border-border">
        <div className="border-b border-border px-5 py-4 sm:px-6 sm:py-5">
          <h1 className="font-heading text-[19px] font-semibold tracking-tight text-foreground">
            News Navigator
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Ask anything about today&apos;s news
          </p>
        </div>

        <div
          className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6"
          aria-live="polite"
          aria-busy={loading}
        >
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[88%] text-[13px] leading-relaxed sm:max-w-[80%]",
                  msg.role === "user"
                    ? "rounded-xl rounded-br-sm bg-accent px-3.5 py-2 text-white"
                    : "rounded-xl rounded-bl-sm border border-border bg-card px-4 py-3 text-foreground"
                )}
              >
                <Markdown content={msg.content} />
                {msg.sources && msg.sources.length > 0 && (
                  <SourcesAccordion sources={msg.sources} />
                )}
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex max-w-[75%] items-center gap-2 rounded-xl rounded-bl-sm border border-border bg-card px-4 py-3">
                <Loader2
                  className="h-3.5 w-3.5 animate-spin text-muted-foreground motion-reduce:animate-none"
                  aria-hidden
                />
                <span className="text-[13px] text-muted-foreground">
                  Thinking…
                </span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="border-t border-border px-4 py-3.5 sm:px-6 sm:py-4">
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
          >
            <label htmlFor="chat-input" className="sr-only">
              Message the news assistant
            </label>
            <input
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about any topic in today's news…"
              autoComplete="off"
              className="flex-1 rounded-lg border border-border bg-muted/60 px-3.5 py-2.5 text-[13.5px] text-foreground placeholder:text-muted-foreground focus:border-ring/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/25"
            />
            <button
              id="chat-send-btn"
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <SendHorizonal className="h-4 w-4" aria-hidden />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── Context panel ────────────────────────────────── */}
      <aside className="hidden w-[300px] flex-shrink-0 flex-col gap-4 overflow-y-auto p-5 lg:flex">
        <div className="rounded-xl border border-accent/25 bg-accent-soft p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-soft-foreground">
            Active topic
          </p>
          <p className="font-heading text-[14px] font-medium text-foreground">
            India AI Policy Framework
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Tracking 3 story threads · Updated 2h ago
          </p>
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Related articles
        </p>

        {relatedLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-[86px] w-full" />
            ))}
          </div>
        ) : relatedArticles.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No related stories"
            description="Related coverage will appear here once the newsroom has ingested more articles."
            className="px-4 py-8"
          />
        ) : (
          <div className="space-y-2">
            {relatedArticles.map((article) => (
              <button
                key={article.id}
                type="button"
                onClick={() => router.push(`/home/article/${article.id}`)}
                className="block w-full cursor-pointer rounded-lg border border-border p-3 text-left transition-colors hover:border-border-hover hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CategoryTag>{article.category}</CategoryTag>
                <p className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
                  {formatHeadline(article.headline)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {article.source}
                </p>
              </button>
            ))}
          </div>
        )}

        <Link
          href="/trending"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-border-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <TrendingUp className="h-4 w-4" aria-hidden />
          Story Arcs
        </Link>
      </aside>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ChatPageInner />
    </Suspense>
  );
}
