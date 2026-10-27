"use client";

import { useParams } from "next/navigation";

import { ArticleReader } from "@/components/article/ArticleReader";

/**
 * Canonical article reader. The legacy /article/[id] route permanently
 * redirects here, so both URL shapes share this single implementation.
 */
export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  return <ArticleReader articleId={id} />;
}
