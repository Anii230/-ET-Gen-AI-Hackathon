"use client";

import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";

import { ArticleThumbnail } from "@/components/ui/article-thumbnail";
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

type CardVariant = "feature" | "medium" | "wide" | "compact";

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

/**
 * Column spans for one 12-column block, chosen so every completed row adds up
 * to twelve. Short feeds get a deliberately balanced composition instead of a
 * lead card followed by a trail of empty space.
 */
const BLOCK_PLANS: Record<number, number[]> = {
  1: [12],
  2: [7, 5],
  3: [7, 5, 12],
  4: [7, 5, 6, 6],
  5: [7, 5, 4, 4, 4],
  6: [7, 5, 4, 4, 4, 12],
  7: [7, 5, 4, 4, 4, 6, 6],
  8: [7, 5, 4, 4, 4, 3, 3, 6],
  9: [7, 5, 4, 4, 4, 3, 3, 3, 3],
  10: [7, 5, 4, 4, 4, 4, 4, 4, 6, 6],
  11: [7, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  12: [7, 5, 4, 4, 4, 3, 3, 3, 3, 4, 4, 4],
};

const SPAN_CLASS: Record<number, string> = {
  12: "md:col-span-6 xl:col-span-12",
  7: "md:col-span-6 xl:col-span-7",
  6: "md:col-span-3 xl:col-span-6",
  5: "md:col-span-3 xl:col-span-5",
  4: "md:col-span-3 xl:col-span-4",
  3: "md:col-span-3 xl:col-span-3",
};

function layoutFor(index: number, total: number) {
  const blockStart = Math.floor(index / 12) * 12;
  const blockCount = Math.min(12, total - blockStart);
  const plan = BLOCK_PLANS[blockCount] ?? BLOCK_PLANS[12];
  const position = index - blockStart;
  const span = plan[Math.min(position, plan.length - 1)] ?? 12;

  let variant: CardVariant;
  if (position === 0 && span >= 7) variant = "feature";
  else if (span === 12) variant = "wide";
  else if (span >= 5) variant = "medium";
  else variant = "compact";

  return { span, variant, className: SPAN_CLASS[span] ?? SPAN_CLASS[12] };
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
        inverted ? "text-white/65" : "text-muted-foreground"
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

function LabelRow({
  article,
  context,
  inverted = false,
}: {
  article: Article;
  context: CategoryContext;
  inverted?: boolean;
}) {
  return (
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
  );
}

const CARD_LINK =
  "group h-full overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function FeatureCard({
  article,
  context,
  className,
  priority,
}: {
  article: Article;
  context: CategoryContext;
  className: string;
  priority: boolean;
}) {
  return (
    <Link
      href={`/home/article/${article.id}`}
      className={cn(
        CARD_LINK,
        "relative flex min-h-[380px] flex-col justify-end sm:min-h-[430px]",
        className
      )}
    >
      <div className="absolute inset-0 z-0">
        <ArticleThumbnail
          src={article.image_url}
          sizes="(min-width: 1280px) 56vw, 100vw"
          priority={priority}
          tone="dark"
        />
        <div
          aria-hidden
          className="absolute inset-0 z-20 bg-[linear-gradient(to_top,rgba(9,9,14,0.95)_0%,rgba(9,9,14,0.66)_42%,rgba(9,9,14,0.12)_100%)]"
        />
      </div>

      <div className="relative z-30 p-5 sm:p-6 lg:p-7">
        <LabelRow article={article} context={context} inverted />

        <h2 className="mt-3 text-balance font-heading text-[24px] font-semibold leading-[1.15] tracking-tight text-white group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4 sm:text-[30px] lg:text-[34px]">
          {formatHeadline(article.headline)}
        </h2>

        {article.summary ? (
          <p className="mt-2.5 line-clamp-3 max-w-[64ch] text-[13.5px] leading-relaxed text-white/75">
            {stripHtml(article.summary)}
          </p>
        ) : null}

        <Meta article={article} inverted />
      </div>
    </Link>
  );
}

function MediumCard({
  article,
  context,
  className,
  priority,
}: {
  article: Article;
  context: CategoryContext;
  className: string;
  priority: boolean;
}) {
  return (
    <Link href={`/home/article/${article.id}`} className={cn(CARD_LINK, "flex flex-col", className)}>
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <ArticleThumbnail
          src={article.image_url}
          sizes="(min-width: 1280px) 38vw, (min-width: 768px) 50vw, 100vw"
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <LabelRow article={article} context={context} />

        <h3 className="mt-2.5 font-heading text-[17px] font-semibold leading-snug tracking-tight text-foreground group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4 sm:text-[18px]">
          {formatHeadline(article.headline)}
        </h3>

        {article.summary ? (
          <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
            {stripHtml(article.summary)}
          </p>
        ) : null}

        <Meta article={article} />
      </div>
    </Link>
  );
}

function WideCard({
  article,
  context,
  className,
  priority,
}: {
  article: Article;
  context: CategoryContext;
  className: string;
  priority: boolean;
}) {
  return (
    <Link
      href={`/home/article/${article.id}`}
      className={cn(CARD_LINK, "flex flex-col sm:flex-row", className)}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden sm:aspect-auto sm:w-[42%] sm:min-h-[200px]">
        <ArticleThumbnail
          src={article.image_url}
          sizes="(min-width: 1280px) 40vw, 100vw"
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <LabelRow article={article} context={context} />
        <h3 className="mt-2.5 font-heading text-[18px] font-semibold leading-snug tracking-tight text-foreground group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4 sm:text-[20px]">
          {formatHeadline(article.headline)}
        </h3>
        {article.summary ? (
          <p className="mt-2 line-clamp-2 max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">
            {stripHtml(article.summary)}
          </p>
        ) : null}
        <Meta article={article} />
      </div>
    </Link>
  );
}

function CompactCard({
  article,
  context,
  className,
  priority,
}: {
  article: Article;
  context: CategoryContext;
  className: string;
  priority: boolean;
}) {
  return (
    <Link href={`/home/article/${article.id}`} className={cn(CARD_LINK, "flex flex-col", className)}>
      <div className="relative aspect-[3/2] w-full overflow-hidden">
        <ArticleThumbnail
          src={article.image_url}
          sizes="(min-width: 1280px) 26vw, (min-width: 768px) 45vw, 100vw"
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <LabelRow article={article} context={context} />

        <h3 className="mt-2 font-heading text-[14.5px] font-semibold leading-snug tracking-tight text-foreground group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
          {formatHeadline(article.headline)}
        </h3>

        {article.summary ? (
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
            {stripHtml(article.summary)}
          </p>
        ) : null}

        <Meta article={article} />
      </div>
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

  const context: CategoryContext = {
    preferred: preferredCategories,
    labels: categoryLabels,
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-6 md:items-stretch xl:grid-cols-12">
      {articles.map((article, index) => {
        const { variant, className } = layoutFor(index, articles.length);
        const priority = index === 0;

        if (variant === "feature") {
          return (
            <FeatureCard
              key={article.id}
              article={article}
              context={context}
              className={className}
              priority={priority}
            />
          );
        }
        if (variant === "wide") {
          return (
            <WideCard
              key={article.id}
              article={article}
              context={context}
              className={className}
              priority={priority}
            />
          );
        }
        if (variant === "medium") {
          return (
            <MediumCard
              key={article.id}
              article={article}
              context={context}
              className={className}
              priority={priority}
            />
          );
        }
        return (
          <CompactCard
            key={article.id}
            article={article}
            context={context}
            className={className}
            priority={priority}
          />
        );
      })}
    </div>
  );
}
