"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  Brain,
  ChevronRight,
  Target,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getStoryArcs, getBriefing, StoryArc } from "@/lib/api";
import { cn, decodeEntities, formatHeadline, pluralize } from "@/lib/utils";

const TREND_LABEL: Record<string, string> = {
  improving: "Improving",
  declining: "Declining",
  stable: "Stable",
};

function sentimentClass(sentiment: string): string {
  if (sentiment === "positive")
    return "border-success/25 bg-success/10 text-success";
  if (sentiment === "negative")
    return "border-destructive/25 bg-destructive/10 text-destructive";
  return "border-border bg-tag text-tag-foreground";
}

function sentimentDot(sentiment: string): string {
  if (sentiment === "positive") return "bg-success";
  if (sentiment === "negative") return "bg-destructive";
  return "bg-muted-foreground";
}

function MarkdownText({ content }: { content: string }) {
  if (!content) return null;
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      })}
    </>
  );
}

function SentimentChart({
  timeline,
  selectedIndices,
  onToggle,
}: {
  timeline: StoryArc["timeline"];
  selectedIndices: number[];
  onToggle: (index: number) => void;
}) {
  const points = timeline.map((event, index) => {
    const x = timeline.length > 1 ? (index / (timeline.length - 1)) * 100 : 50;
    const y =
      event.sentiment === "positive"
        ? 24
        : event.sentiment === "negative"
          ? 76
          : 50;
    return { x, y, event };
  });

  const line = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Sentiment flow
        </p>
        <p className="text-[11px] text-muted-foreground">
          Select points to synthesise
        </p>
      </div>

      <div className="relative h-[190px] w-full sm:h-[220px]">
        <div
          aria-hidden
          className="absolute inset-x-0 top-[24%] h-px bg-border"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-px bg-border"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-[76%] h-px bg-border"
        />

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
          className="absolute inset-0 h-full w-full"
        >
          <polyline
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            points={line}
            opacity={0.55}
          />
        </svg>

        {points.map((point, index) => {
          const isSelected = selectedIndices.includes(index);
          const label = `${point.event.date}: ${formatHeadline(point.event.headline)} (${point.event.sentiment})`;
          return (
            <button
              key={`${point.event.article_id}-${index}`}
              type="button"
              onClick={() => onToggle(index)}
              aria-pressed={isSelected}
              aria-label={label}
              title={label}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              className={cn(
                "absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 transition-transform",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                isSelected
                  ? "h-4 w-4 scale-110 border-accent bg-accent"
                  : "h-3 w-3 border-background bg-foreground/60 hover:scale-125"
              )}
            >
              <span className="sr-only">{point.event.sentiment}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span>Start</span>
        <span>Neutral</span>
        <span>Latest</span>
      </div>
    </div>
  );
}

function NarrativeTimeline({ timeline }: { timeline: StoryArc["timeline"] }) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto pb-2">
      <ol className="flex min-w-full gap-3" style={{ width: "max-content" }}>
        {timeline.map((event, index) => (
          <li key={`${event.article_id}-${index}`} className="w-[240px] flex-shrink-0">
            <button
              type="button"
              onClick={() => router.push(`/home/article/${event.article_id}`)}
              className="group flex h-full w-full cursor-pointer flex-col rounded-lg border border-border bg-card p-3.5 text-left transition-colors hover:border-border-hover hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  T+{index + 1}
                </span>
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    sentimentDot(event.sentiment)
                  )}
                  aria-hidden
                />
              </div>
              <time className="mt-2 text-[10.5px] text-muted-foreground">
                {event.date}
              </time>
              <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug text-foreground group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                {formatHeadline(event.headline)}
              </p>
              <span className="mt-auto flex items-center gap-1 pt-3 text-[10.5px] text-muted-foreground">
                {event.source}
                <ChevronRight className="h-3 w-3" aria-hidden />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ArcPlayers({ players }: { players: StoryArc["key_players"] }) {
  if (players.length === 0) {
    return (
      <p className="py-4 text-[12px] text-muted-foreground">
        No dominant players were detected in this arc.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {players.slice(0, 4).map((player) => (
        <li
          key={player.name}
          className="flex items-center gap-2.5 rounded-lg border border-border bg-background/60 p-2"
        >
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-border bg-tag text-[11px] font-semibold text-tag-foreground">
            {decodeEntities(player.name).slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-foreground">
              {decodeEntities(player.name)}
            </p>
            <p className="text-[10.5px] text-muted-foreground">
              {player.mention_count}{" "}
              {pluralize(player.mention_count, "mention")}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function TrendingPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [arcs, setArcs] = useState<StoryArc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeArc, setActiveArc] = useState<string | null>(null);
  const [selectedEventIndices, setSelectedEventIndices] = useState<number[]>([]);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getStoryArcs()
      .then((data) => {
        if (cancelled) return;
        setArcs(data);
        setActiveArc((current) =>
          current && data.some((arc) => arc.id === current)
            ? current
            : data[0]?.id ?? null
        );
      })
      .catch(() => {
        if (cancelled) return;
        setArcs([]);
        setError(
          "Story arcs could not be loaded. Check the connection and try again."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    setSelectedEventIndices([]);
    setSummaryResult("");
  }, [activeArc]);

  const selected = useMemo(
    () => arcs.find((arc) => arc.id === activeArc) ?? null,
    [arcs, activeArc]
  );

  const toggleEvent = (index: number) => {
    setSelectedEventIndices((prev) =>
      prev.includes(index)
        ? prev.filter((item) => item !== index)
        : [...prev, index].sort((a, b) => a - b)
    );
  };

  const generateSummary = async () => {
    if (selectedEventIndices.length === 0 || !selected) return;

    setSummarizing(true);
    setSummaryResult("");

    try {
      const articleIds = selectedEventIndices.map(
        (index) => selected.timeline[index].article_id
      );
      const result = await getBriefing(
        "demo_user",
        "Summarise these articles into a very concise briefing of two sentences maximum. Focus on narrative connections. No bold headers.",
        articleIds
      );
      setSummaryResult(result.briefing);
    } catch {
      setSummaryResult(
        "Sorry, these events could not be synthesised right now. Please try again."
      );
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-3 w-72" />
        <div className="mt-8 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-lg" />
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-52 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6">
        <ErrorState
          title="Story arcs unavailable"
          message={error}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted">
            <TrendingUp className="h-4 w-4 text-foreground" aria-hidden />
          </span>
          <h1 className="font-heading text-[24px] font-semibold tracking-tight text-foreground sm:text-[28px]">
            Story Arcs
          </h1>
        </div>
        <p className="mt-2 text-[13.5px] text-muted-foreground">
          AI-tracked narratives across ongoing news stories.
        </p>
      </header>

      {arcs.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No story arcs yet"
          description="Arcs appear once the newsroom has enough related coverage. Check back after more articles are ingested."
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
          <nav aria-label="Story arcs" className="space-y-1.5">
            {arcs.map((arc) => {
              const isActive = arc.id === activeArc;
              return (
                <button
                  key={arc.id}
                  type="button"
                  onClick={() => setActiveArc(arc.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "w-full cursor-pointer rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "border-accent/40 bg-accent-soft"
                      : "border-border bg-card hover:border-border-hover"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13.5px] font-medium leading-snug text-foreground">
                      {arc.title}
                    </span>
                    <span
                      className={cn(
                        "flex flex-shrink-0 items-center gap-1 rounded-[4px] border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]",
                        sentimentClass(arc.overall_sentiment)
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "h-1 w-1 rounded-full",
                          sentimentDot(arc.overall_sentiment)
                        )}
                      />
                      {arc.overall_sentiment}
                    </span>
                  </div>
                  <span className="mt-2 block text-[11px] text-muted-foreground">
                    {arc.article_count}{" "}
                    {pluralize(arc.article_count, "story", "stories")}
                    <span aria-hidden className="mx-1">
                      ·
                    </span>
                    {TREND_LABEL[arc.sentiment_trend] || arc.sentiment_trend}
                  </span>
                </button>
              );
            })}
          </nav>

          {selected ? (
            <article key={selected.id} className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6">
              <header>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-balance font-heading text-[22px] font-semibold tracking-tight text-foreground sm:text-[26px]">
                    {formatHeadline(selected.title)}
                  </h2>
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-[4px] border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
                      sentimentClass(selected.overall_sentiment)
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "h-1 w-1 rounded-full",
                        sentimentDot(selected.overall_sentiment)
                      )}
                    />
                    {selected.overall_sentiment} ·{" "}
                    {TREND_LABEL[selected.sentiment_trend] ||
                      selected.sentiment_trend}
                  </span>
                </div>
                <p className="mt-2.5 max-w-3xl text-[13.5px] leading-relaxed text-muted-foreground">
                  {decodeEntities(selected.description)}
                </p>
              </header>

              <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <SentimentChart
                  timeline={selected.timeline}
                  selectedIndices={selectedEventIndices}
                  onToggle={toggleEvent}
                />

                <section className="flex flex-col rounded-xl border border-border bg-background/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Target
                      className="h-3.5 w-3.5 text-muted-foreground"
                      aria-hidden
                    />
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Network influence
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <ArcPlayers players={selected.key_players} />
                  </div>

                  {selectedEventIndices.length > 1 ? (
                    <Button
                      size="lg"
                      className="mt-4 w-full"
                      onClick={() => void generateSummary()}
                      disabled={summarizing}
                    >
                      <Brain className="h-3.5 w-3.5" aria-hidden />
                      {summarizing
                        ? "Synthesising…"
                        : `Synthesise ${selectedEventIndices.length} events`}
                    </Button>
                  ) : null}
                </section>
              </div>

              {selectedEventIndices.length > 0 || summaryResult || summarizing ? (
                <motion.section
                  initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
                  animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="mt-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Analysis panel
                      </h3>
                      <span className="text-[11px] text-muted-foreground">
                        {selectedEventIndices.length}{" "}
                        {pluralize(selectedEventIndices.length, "event")}{" "}
                        selected
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEventIndices([]);
                        setSummaryResult("");
                      }}
                      className="cursor-pointer text-[11px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Clear selection
                    </button>
                  </div>

                  {summarizing || summaryResult ? (
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Brain
                          className="h-3.5 w-3.5 text-accent-soft-foreground"
                          aria-hidden
                        />
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-soft-foreground">
                          AI narrative lens
                        </p>
                      </div>
                      {summarizing ? (
                        <div className="space-y-2">
                          <Skeleton className="h-3.5 w-full" />
                          <Skeleton className="h-3.5 w-2/3" />
                        </div>
                      ) : (
                        <p className="text-[13.5px] leading-relaxed text-foreground/85">
                          <MarkdownText content={summaryResult} />
                        </p>
                      )}
                    </div>
                  ) : null}

                  <div className="grid gap-2.5 md:grid-cols-2">
                    {selectedEventIndices.map((index) => {
                      const event = selected.timeline[index];
                      return (
                        <div
                          key={index}
                          className="flex flex-col gap-2 rounded-lg border border-border bg-background/50 p-3.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
                              <span
                                aria-hidden
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  sentimentDot(event.sentiment)
                                )}
                              />
                              {event.date}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleEvent(index)}
                              className="cursor-pointer text-[10.5px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              Remove
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/home/article/${event.article_id}`)
                            }
                            className="cursor-pointer text-left text-[13.5px] font-medium leading-snug text-foreground transition-colors hover:text-accent-soft-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {formatHeadline(event.headline)}
                          </button>
                          <div className="mt-auto flex items-center justify-between border-t border-border pt-2 text-[10.5px] text-muted-foreground">
                            <span className="truncate">{event.source}</span>
                            <span className="capitalize">{event.sentiment}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.section>
              ) : null}

              <section className="mt-8">
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Strategic timeline
                  </h3>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                </div>
                <NarrativeTimeline timeline={selected.timeline} />
              </section>

              {selected.what_to_watch ? (
                <section className="mt-8 rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <Target
                      className="h-3.5 w-3.5 text-muted-foreground"
                      aria-hidden
                    />
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      What to watch
                    </h3>
                  </div>
                  <p className="text-[13.5px] leading-relaxed text-foreground/85">
                    <MarkdownText content={decodeEntities(selected.what_to_watch)} />
                  </p>
                </section>
              ) : null}
            </article>
          ) : null}
        </div>
      )}
    </div>
  );
}
