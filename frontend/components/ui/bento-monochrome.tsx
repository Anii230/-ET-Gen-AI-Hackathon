"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type BentoArticle = {
  id: string;
  category: string;
  categoryColor: string;
  headline: string;
  summary: string;
  source: string;
  time: string;
  readTime: string;
  isPersonalised: boolean;
  image_url?: string;
};

function getSpan(index: number): string {
  const pattern = [
    "md:col-span-4 md:row-span-2",  // 0: hero
    "md:col-span-2 md:row-span-1",  // 1: top right
    "md:col-span-2 md:row-span-1",  // 2: mid right
    "md:col-span-3 md:row-span-1",  // 3: bottom left
    "md:col-span-3 md:row-span-1",  // 4: bottom right
    "md:col-span-2 md:row-span-1",  // 5
    "md:col-span-2 md:row-span-1",  // 6
    "md:col-span-2 md:row-span-1",  // 7
    "md:col-span-3 md:row-span-1",  // 8
    "md:col-span-3 md:row-span-1",  // 9
  ];
  return pattern[index % pattern.length];
}

function getCategoryStyle(category: string): string {
  const styles: Record<string, string> = {
    Markets: "bg-green-500/10 text-green-400 border-green-500/20",
    Economy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Tech: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Startups: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    Policy: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Science: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    Sports: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    Entertainment: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    Business: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    General: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
  return styles[category] || styles.General;
}

function getTopBorderStyle(category: string): string {
  const styles: Record<string, string> = {
    Markets: "bg-green-500",
    Economy: "bg-emerald-500",
    Tech: "bg-blue-500",
    Startups: "bg-purple-500",
    Policy: "bg-amber-500",
    Science: "bg-teal-500",
    Sports: "bg-orange-500",
    Entertainment: "bg-pink-500",
    Business: "bg-cyan-500",
    General: "bg-zinc-500",
  };
  return styles[category] || styles.General;
}

export function BentoMonochrome({ articles, onArticleClick }: { articles: BentoArticle[]; onArticleClick?: (id: string) => void }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.classList.contains("dark"));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 auto-rows-[minmax(180px,auto)] pb-12">
        {articles.map((article, i) => {
          const isHero = i === 0;

          return (
            <motion.div
              key={article.id}
              onClick={() => onArticleClick?.(article.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1 cursor-pointer",
                "border shadow-sm",
                !(isHero && article.image_url) && "bg-[var(--background-secondary)] border-[var(--border)] hover:border-[var(--border-hover)]",
                (isHero && article.image_url) ? "justify-end border-transparent" : "justify-between",
                getSpan(i)
              )}
            >
              {/* Image backgrounds */}
              {isHero && article.image_url && (
                <div
                  style={{
                    backgroundImage: `url(${article.image_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'absolute',
                    inset: 0,
                    zIndex: 0,
                    borderRadius: 'inherit',
                    overflow: 'hidden',
                  }}
                  className="opacity-80 transition-opacity duration-300 group-hover:opacity-100"
                >
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.5), rgba(0,0,0,0.2))'
                  }} />
                </div>
              )}
              
              {!isHero && article.image_url && (
                <div
                  style={{
                    backgroundImage: `url(${article.image_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'absolute',
                    inset: 0,
                    zIndex: 0,
                    borderRadius: 'inherit',
                    overflow: 'hidden',
                  }}
                  className="opacity-20 transition-opacity duration-300 group-hover:opacity-50"
                />
              )}
              {/* Subtle background wash effect */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: isDark
                    ? "radial-gradient(100% 100% at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 100%)"
                    : "radial-gradient(100% 100% at 50% 0%, rgba(0,0,0,0.02) 0%, transparent 100%)"
                }}
              />
              
              {/* Thin colored top border */}
              <div
                className={cn(
                  "absolute top-0 left-0 right-0 h-[2px]",
                  getTopBorderStyle(article.category)
                )}
              />

              {/* Top row */}
              <div className="flex items-center gap-2 relative z-10 w-full mb-4">
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                    (isHero && article.image_url)
                      ? "bg-white/20 text-white border border-white/30 backdrop-blur-sm shadow-sm"
                      : getCategoryStyle(article.category)
                  )}
                >
                  {article.category}
                </span>

                {article.isPersonalised && (
                  <span className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded-full ml-auto font-medium">
                    <Sparkles className="w-3" />
                    For You
                  </span>
                )}
              </div>

              {/* Middle row */}
              <div className="flex flex-col gap-2 relative z-10 flex-1">
                <h3
                  className={cn(
                    "font-semibold tracking-tight leading-snug",
                    isHero ? "text-2xl lg:text-3xl" : "text-base lg:text-lg",
                    (isHero && article.image_url) ? "text-white" : "text-foreground"
                  )}
                >
                  {article.headline}
                </h3>

                <p
                  className={cn(
                    "text-sm leading-relaxed mt-2",
                    isHero ? "line-clamp-3" : "line-clamp-2",
                    (isHero && article.image_url) ? "text-white/80" : "text-neutral-600 dark:text-neutral-400"
                  )}
                >
                  {article.summary}
                </p>
              </div>

              {/* Bottom row */}
              <div className="flex items-center gap-2 mt-auto pt-6 relative z-10">
                <span className={cn(
                  "text-xs font-medium tracking-wide",
                  (isHero && article.image_url) ? "text-white/60" : "text-neutral-500 dark:text-neutral-500"
                )}>
                  {article.source} <span className="mx-1 opacity-50">·</span> {article.time}
                </span>

                <span className={cn(
                  "flex items-center gap-1 text-xs font-medium tracking-wide ml-auto",
                  (isHero && article.image_url) ? "text-white/60" : "text-neutral-500 dark:text-neutral-500"
                )}>
                  <Clock className="w-3.5 h-3.5 opacity-60" />
                  {article.readTime}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
