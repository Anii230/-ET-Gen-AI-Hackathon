import { Article } from "@/lib/api";
import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export function SmallArticleCard({ article }: { article: Article }) {
  const router = useRouter();
  
  const categoryColors: Record<string, string> = {
    "AI": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    "Tech": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Economy": "bg-green-500/10 text-green-400 border-green-500/20",
    "Markets": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Startups": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "Policy": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  const pillStyle = categoryColors[article.category] || categoryColors["AI"];

  // Vague formatting similar to bento cards for mock UI
  let timeStr = "Recent";
  if (article.published_at) {
    const d = new Date(article.published_at);
    timeStr = d.toLocaleDateString();
  }

  return (
    <div
      onClick={() => router.push(`/home/article/${article.id}`)}
      className="group flex flex-col justify-between overflow-hidden rounded-xl p-4 transition-all duration-200 transform hover:-translate-y-[2px] cursor-pointer bg-[var(--background-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] shadow-sm"
    >
      <div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider border ${pillStyle}`}>
          {article.category || "General"}
        </span>
        
        <h3 className="font-medium text-[15px] mt-3 leading-snug text-foreground line-clamp-2">
          {article.headline}
        </h3>
        
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
          {article.summary}
        </p>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--border)]">
        <span className="text-xs text-neutral-500 font-medium tracking-wide flex-1 line-clamp-1">
          {article.source} <span className="mx-1 opacity-50">·</span> {timeStr}
        </span>
        
        <span className="flex items-center gap-1 text-xs text-neutral-500 font-medium tracking-wide">
          <Clock className="w-3.5 h-3.5 opacity-60" />
          {article.read_time}m
        </span>
      </div>
    </div>
  );
}
