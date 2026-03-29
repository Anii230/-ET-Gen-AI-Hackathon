"use client";
import { useEffect, useState } from "react";
import { getBookmarks } from "@/lib/bookmarks";
import { getArticle, Article } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";

export default function SavedPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const ids = getBookmarks();
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(ids.map(id => getArticle(id).catch(() => null)))
      .then(results => {
        setArticles(results.filter(Boolean) as Article[]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 
      text-muted-foreground text-sm">Loading saved articles...</div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold">Saved</h1>
        <span className="text-xs px-2 py-1 rounded-full 
          bg-indigo-500/10 text-indigo-400 
          border border-indigo-500/20">
          {articles.length}
        </span>
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center 
          justify-center h-64 gap-4">
          <Bookmark className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nothing saved yet</p>
          <button
            onClick={() => router.push('/home')}
            className="text-sm text-indigo-400 
              hover:text-indigo-300 transition-colors cursor-pointer"
          >
            Browse feed →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 
          lg:grid-cols-3 gap-4">
          {articles.map(article => (
            <div
              key={article.id}
              onClick={() => router.push(`/home/article/${article.id}`)}
              className="p-4 rounded-xl border border-border 
                bg-card hover:border-border/80 
                hover:-translate-y-0.5 transition-all 
                duration-200 cursor-pointer"
            >
              <span className="text-xs px-2 py-0.5 rounded-full 
                bg-indigo-500/10 text-indigo-400 
                border border-indigo-500/20">
                {article.category}
              </span>
              <h3 className="mt-2 font-medium text-sm 
                line-clamp-2 leading-snug">
                {article.headline}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {article.source}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
