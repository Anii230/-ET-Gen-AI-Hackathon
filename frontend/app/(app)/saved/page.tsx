"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CategoryTag } from "@/components/ui/category-tag";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/layout/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { getArticle, Article } from "@/lib/api";
import { getBookmarks } from "@/lib/bookmarks";
import { formatHeadline, formatPublishedAt, stripHtml } from "@/lib/utils";

export default function SavedPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getBookmarks();
    let cancelled = false;

    Promise.all(ids.map((id) => getArticle(id).catch(() => null)))
      .then((results) => {
        if (cancelled) return;
        setArticles(results.filter((item): item is Article => item !== null));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageContainer className="py-6 sm:py-8">
      <header className="mb-6 flex items-center gap-3">
        <h1 className="font-heading text-[24px] font-semibold tracking-tight text-foreground sm:text-[28px]">
          Saved
        </h1>
        <span className="rounded-[5px] border border-border bg-tag px-2 py-0.5 text-[11px] tabular-nums text-tag-foreground">
          {articles.length}
        </span>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[148px] w-full rounded-xl" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          description="Save a story from the feed or the reader and it will be waiting here."
          action={
            <Button asChild size="lg">
              <Link href="/home">Browse the feed</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/home/article/${article.id}`}
              className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-hover hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex items-center justify-between gap-2">
                <CategoryTag>{article.category || "General"}</CategoryTag>
                <span className="text-[10.5px] text-muted-foreground">
                  {formatPublishedAt(article.published_at)}
                </span>
              </div>

              <h2 className="mt-2.5 line-clamp-2 font-heading text-[14.5px] font-semibold leading-snug tracking-tight text-foreground group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                {formatHeadline(article.headline)}
              </h2>

              {article.summary ? (
                <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                  {stripHtml(article.summary)}
                </p>
              ) : null}

              <p className="mt-auto pt-3 text-[11px] text-muted-foreground">
                {article.source}
              </p>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
