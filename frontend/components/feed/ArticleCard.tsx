"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Clock, Sparkles } from "lucide-react";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { type Article, categoryStyles } from "@/lib/mock-data";

export { categoryStyles } from "@/lib/mock-data";

interface ArticleCardProps {
  article: Article;
  className?: string;
  variant?: "hero" | "medium" | "small" | "wide";
  index?: number;
  noSummary?: boolean;
}

export function ArticleCard({
  article,
  className = "",
  variant = "medium",
  index = 0,
  noSummary = false,
}: ArticleCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  const styles = categoryStyles[article.categoryColor] ?? categoryStyles.indigo;
  const isHero = variant === "hero";
  const isSmall = variant === "small";
  const isWide = variant === "wide";

  return (
    <motion.div
      ref={ref}
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
      animate={shouldReduceMotion ? {} : (isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 })}
      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.08 }}
      className={`h-full ${className}`}
    >
      <Link
        href={`/article/${article.id}`}
        id={`article-card-${article.id}`}
        className={`
          group relative flex flex-col h-full rounded-xl overflow-hidden cursor-pointer
          bg-[var(--background-secondary)] border border-[var(--border)]
          hover:border-[var(--border-hover)] hover:-translate-y-0.5
          transition-all duration-200 ease-out z-10
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50
          ${isHero ? "border-t-2 border-indigo-500 min-h-[420px]" : ""}
          ${variant === "medium" || isSmall ? "min-h-[200px]" : ""}
          ${isWide ? "min-h-[140px]" : ""}
        `}
      >
        {isHero && (
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/8 via-transparent to-transparent rounded-xl pointer-events-none" />
        )}
        {/* Full bleed background wash for Hero */}
        {isHero && <div className="absolute inset-0 bg-indigo-500/[0.04] dark:bg-indigo-500/10 pointer-events-none -z-10" />}

        {/* Top color bar — non-hero, non-wide cards */}
        {!isHero && !isWide && (
          <div className={`h-[2px] w-full flex-shrink-0 ${styles.bar}`} />
        )}

        {/* Content */}
        <div className={`flex flex-1 w-full h-full ${
          isHero ? "flex-col p-6 pt-0 justify-end" : 
          isWide ? "flex-row p-5 items-center justify-between gap-6" : 
          "flex-col p-5 justify-between"
        }`}>
          
          {isWide ? (
            <>
              {/* ── WIDE LAYOUT ── */}
              <div className="flex flex-col gap-2.5 flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${styles.pill}`}>
                    {article.category}
                  </span>
                  {article.isPersonalized && (
                    <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-medium">
                      <Sparkles className="w-3 h-3" />
                      For You
                    </span>
                  )}
                </div>
                <h3 className="font-heading font-semibold leading-tight text-[var(--foreground)] text-[20px] line-clamp-2">
                  {article.title}
                </h3>
                {!noSummary && (
                  <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed line-clamp-1">
                    {article.summary}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end justify-center gap-2 flex-shrink-0 text-right border-l border-[var(--border)] pl-6">
                <span className="font-medium text-sm text-[var(--foreground-secondary)]">{article.source}</span>
                <span className="font-mono text-xs text-[var(--foreground-secondary)] opacity-70">{article.timestamp}</span>
                <div className="flex items-center gap-1 text-xs text-[var(--foreground-secondary)] mt-1">
                  <Clock className="w-3.5 h-3.5 opacity-60" />
                  <span className="font-mono text-[11px]">{article.readTime}m</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ── HERO / MEDIUM / SMALL LAYOUT ── */}
              <div className={`flex flex-col ${isHero ? "gap-4" : "gap-3"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${styles.pill}`}>
                    {article.category}
                  </span>
                  {article.isPersonalized && (
                    <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-medium">
                      <Sparkles className="w-3 h-3" />
                      For You
                    </span>
                  )}
                </div>

                <h3 className={`font-heading font-medium leading-snug text-[var(--foreground)] ${
                  isHero ? "text-[28px] lg:text-[32px] font-semibold tracking-tight" : 
                  isSmall ? "text-[16px]" : "text-[18px]"
                }`}>
                  {article.title}
                </h3>

                {/* Show summary on Hero and Medium and Small. */}
                {!noSummary && (
                  <p className={`text-sm text-[var(--foreground-secondary)] leading-relaxed ${isHero ? "line-clamp-3 text-[15px]" : "line-clamp-2"}`}>
                    {article.summary}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className={`flex items-center justify-between gap-2 ${isHero ? "mt-6 border-t border-[var(--border)] pt-4" : "mt-auto pt-4"}`}>
                <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-secondary)] min-w-0">
                  <span className="font-medium truncate">{article.source}</span>
                  <span className="opacity-40">·</span>
                  <span className="font-mono text-[11px] opacity-70 whitespace-nowrap">{article.timestamp}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--foreground-secondary)] whitespace-nowrap flex-shrink-0">
                  <Clock className="w-3 h-3 opacity-60" />
                  <span className="font-mono text-[11px]">{article.readTime}m</span>
                </div>
              </div>
            </>
          )}

        </div>
      </Link>
    </motion.div>
  );
}
