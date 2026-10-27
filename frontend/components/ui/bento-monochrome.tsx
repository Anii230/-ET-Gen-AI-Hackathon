"use client";

import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";

import { CategoryTag } from "@/components/ui/category-tag";
import type { Article } from "@/lib/api";
import {
  cn,
  formatHeadline,
  formatPublishedAt,
  stripHtml,
} from "@/lib/utils";

type CategoryContext = {
  /** Category ids the reader explicitly follows. */
  preferred?: string[];
  /** Canonical id -> display label, from the categories endpoint. */
  labels?: Map<string, string>;
};

function isPersonalised(article: Article) {
  return Boolean(article.is_personalised);
}

/**
 * Show the category that earned the article its place in For You, falling back
 * to the source's primary label. This keeps a Technology filter from showing
 * cards tagged only "Markets & Investing" for multi-label stories.
 */
function categoryLabel(article: Article, context: CategoryContext): string {
  const preferred = context.preferred ?? [];
  const articleCategories = article.categories ?? [];
  if (preferred.length > 0 && articleCategories.length > 0) {
    const match = preferred.find((id) => articleCategories.includes(id));
    const label = match ? context.labels?.get(match) : undefined;
    if (label) return label;
  }
  return article.category || "General";
}

function Meta({
  article,
  inverted = false,
}: {
  article: Article;
  inverted?: boolean;
}) {
  return (
    <div
      className={cn(
        "mt-auto flex items-center gap-1.5 pt-4 text-[11px]",
        inverted ? "text-white/70" : "text-muted-foreground"
      )}
    >
      <span className="truncate">{article.source || "Unknown"}</span>
      <span aria-hidden>·</span>
      <time dateTime={article.published_at ?? undefined}>
        {formatPublishedAt(article.published_at)}
      </time>
      <span className="ml-auto flex flex-shrink-0 items-center gap-1">
        <Clock className="h-3 w-3 opacity-70" aria-hidden />
        {article.read_time || 3}m
      </span>
    </div>
  );
}

function HeroCard({
  article,
  context,
  fullWidth = false,
}: {
  article: Article;
  context: CategoryContext;
  fullWidth?: boolean;
}) {
  const image = article.image_url || "";
  const inverted = Boolean(image);

  return (
    <Link
      href={`/home/article/${article.id}`}
      className={cn(
        "group relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-xl border border-border bg-card p-6",
        "transition-colors hover:border-border-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        fullWidth ? "md:col-span-6" : "md:col-span-4 md:row-span-2"
      )}
    >
      {image ? (
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          style={{ backgroundImage: `url(${image})` }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.18) 100%)",
            }}
          />
        </div>
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(to_bottom,var(--accent-soft),transparent)]"
        />
      )}

      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryTag
            className={cn(
              inverted &&
                "border-white/20 bg-white/10 text-white/90 backdrop-blur-sm"
            )}
          >
            {categoryLabel(article, context)}
          </CategoryTag>
          {isPersonalised(article) ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium",
                inverted ? "text-white/70" : "text-accent-soft-foreground"
              )}
            >
              <Sparkles className="h-3 w-3" aria-hidden />
              For You
            </span>
          ) : null}
        </div>

        <h2
          className={cn(
            "mt-4 text-balance font-heading text-[24px] font-semibold leading-[1.18] tracking-tight sm:text-[30px]",
            inverted ? "text-white" : "text-foreground",
            "group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4"
          )}
        >
          {formatHeadline(article.headline)}
        </h2>

        {article.summary ? (
          <p
            className={cn(
              "mt-3 line-clamp-3 max-w-[62ch] text-[14px] leading-relaxed",
              inverted ? "text-white/78" : "text-muted-foreground"
            )}
          >
            {stripHtml(article.summary)}
          </p>
        ) : null}

        <Meta article={article} inverted={inverted} />
      </div>
    </Link>
  );
}

function StoryCard({
  article,
  context,
}: {
  article: Article;
  context: CategoryContext;
}) {
  return (
    <Link
      href={`/home/article/${article.id}`}
      className={cn(
        "group flex min-h-[196px] flex-col rounded-xl border border-border bg-card p-5",
        "transition-colors hover:border-border-hover hover:bg-card/90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "md:col-span-2"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <CategoryTag>{categoryLabel(article, context)}</CategoryTag>
        {isPersonalised(article) ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-accent-soft-foreground">
            <Sparkles className="h-3 w-3" aria-hidden />
            For You
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 line-clamp-2 font-heading text-[15.5px] font-semibold leading-snug tracking-tight text-foreground group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
        {formatHeadline(article.headline)}
      </h3>

      {article.summary ? (
        <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
          {stripHtml(article.summary)}
        </p>
      ) : null}

      <Meta article={article} />
    </Link>
  );
}

export function BentoMonochrome({
  articles,
  preferredCategories,
  categoryLabels,
}: {
  articles: Article[];
  preferredCategories?: string[];
  categoryLabels?: Map<string, string>;
}) {
  if (articles.length === 0) return null;

  const [lead, ...rest] = articles;
  const context: CategoryContext = {
    preferred: preferredCategories,
    labels: categoryLabels,
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:auto-rows-[minmax(210px,auto)] md:grid-cols-6">
      <HeroCard
        article={lead}
        context={context}
        fullWidth={rest.length === 0}
      />
      {rest.map((article) => (
        <StoryCard key={article.id} article={article} context={context} />
      ))}
    </div>
  );
}
