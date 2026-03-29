"use client";

import Link from "next/link";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, Brain, TrendingUp, Bookmark } from "lucide-react";
import { useRef } from "react";
import { categoryStyles } from "@/lib/mock-data";

const PREVIEW_CARDS = [
  { category: "AI",      categoryColor: "indigo",  title: "GPT-5 surpasses all reasoning benchmarks, reshapes research norms", source: "The Verge", timestamp: "2h ago", readTime: 6 },
  { category: "Economy", categoryColor: "emerald", title: "RBI signals sustained rate pause as inflation eases to 4.1%",          source: "Mint",      timestamp: "4h ago", readTime: 4 },
  { category: "Tech",    categoryColor: "blue",    title: "Jio unveils ₹40,000 Cr 6G roadmap with Nokia partnership",            source: "Inc42",     timestamp: "6h ago", readTime: 5 },
];

function BentoPreview() {
  return (
    <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--background-secondary)] overflow-hidden shadow-2xl">
      {/* Fake chrome bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[var(--border)] bg-[var(--background-tertiary)]">
        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
        <div className="ml-auto flex items-center gap-2">
          <div className="h-3 w-24 rounded bg-[var(--border)]" />
        </div>
      </div>

      {/* Mini bento */}
      <div className="p-4 grid grid-cols-5 grid-rows-2 gap-2.5 min-h-[260px]">
        {/* Hero */}
        <div className="col-span-3 row-span-2 rounded-xl bg-[var(--background)] border border-[var(--border)] hover:border-indigo-500/40 transition-all duration-200 border-t-2 border-t-indigo-500 p-4 flex flex-col justify-between cursor-pointer">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 w-fit">
            AI
          </span>
          <div>
            <p className="text-sm font-heading font-medium text-[var(--foreground)] leading-snug line-clamp-3">
              GPT-5 surpasses all reasoning benchmarks, reshapes research norms
            </p>
            <p className="text-[10px] text-[var(--foreground-secondary)] mt-2 font-mono">The Verge · 2h ago · 6m</p>
          </div>
        </div>

        {PREVIEW_CARDS.slice(1).map((card, i) => {
          const style = categoryStyles[card.categoryColor];
          return (
            <div
              key={i}
              className="col-span-2 rounded-xl bg-[var(--background)] border border-[var(--border)] hover:border-indigo-500/30 p-3 flex flex-col justify-between cursor-pointer transition-all duration-200"
            >
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full w-fit ${style.pill}`}>
                {card.category}
              </span>
              <div>
                <p className="text-xs font-medium text-[var(--foreground)] leading-snug line-clamp-2 mt-1">
                  {card.title}
                </p>
                <p className="text-[9px] text-[var(--foreground-secondary)] mt-1 font-mono">
                  {card.source} · {card.timestamp}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const EASE = "easeOut" as const;

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-28 pb-16 px-4 overflow-hidden">
      {/* Radial bg glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(99,102,241,0.12), transparent 65%)",
        }}
      />

      <div className="relative max-w-5xl mx-auto w-full text-center">
        {/* Badge */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-7 flex justify-center"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--background-secondary)] text-xs font-medium text-[var(--foreground-secondary)]">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            ET AI Hackathon 2026 · Track 8
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
          className="font-heading font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-[var(--foreground)] leading-[0.95] mb-6"
        >
          News that
          <br />
          <span className="text-indigo-500">knows you.</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.18 }}
          className="text-lg sm:text-xl text-[var(--foreground-secondary)] max-w-xl mx-auto mb-10 leading-relaxed"
        >
          AI-powered briefings, personalised to how you think. Cut through the noise — get depth, context, and intelligence.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.26 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16"
        >
          <Link
            href="/login"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-all duration-200 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 shadow-lg shadow-indigo-500/20"
          >
            Start Reading
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background-tertiary)] hover:border-[var(--border-hover)] transition-all duration-200 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            See how it works
          </a>
        </motion.div>

        {/* Bento preview */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 40 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
          className="max-w-2xl mx-auto"
        >
          <BentoPreview />
        </motion.div>

        {/* Stat row */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.55 }}
          className="mt-12 flex items-center justify-center gap-8 flex-wrap"
        >
          {[
            { icon: Brain,     label: "AI-ranked stories", value: "10k+" },
            { icon: TrendingUp,label: "Story arcs tracked", value: "2.4k" },
            { icon: Bookmark,  label: "Saved reads",        value: "50k+" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-2 text-[var(--foreground-secondary)]">
              <stat.icon className="w-4 h-4 text-indigo-500" />
              <span className="text-sm">
                <span className="font-semibold text-[var(--foreground)]">{stat.value}</span>{" "}
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
