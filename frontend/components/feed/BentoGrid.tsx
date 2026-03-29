"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useFeedStore } from "@/lib/store";
import { ArticleCard } from "./ArticleCard";
import { mockArticles } from "@/lib/mock-data";

export function BentoGrid() {
  const { activeTab } = useFeedStore();
  const shouldReduceMotion = useReducedMotion();

  const articles =
    activeTab === "for-you"
      ? [...mockArticles].sort((a, b) => (b.isPersonalized ? 1 : 0) - (a.isPersonalized ? 1 : 0))
      : mockArticles;

  const hero   = articles[0];
  const med1   = articles[1];
  const med2   = articles[2];
  const small1 = articles[3];
  const small2 = articles[4];
  const small3 = articles[5];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={shouldReduceMotion ? {} : { opacity: 0 }}
        animate={shouldReduceMotion ? {} : { opacity: 1 }}
        exit={shouldReduceMotion ? {} : { opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bento-grid min-h-[calc(100vh-180px)]"
        aria-label={`${activeTab === "general" ? "General" : "For You"} news feed`}
      >
        {hero   && <div className="bento-hero"   ><ArticleCard article={hero}   variant="hero"   index={0} /></div>}
        {med1   && <div className="bento-medium1"><ArticleCard article={med1}   variant="medium" index={1} /></div>}
        {med2   && <div className="bento-medium2"><ArticleCard article={med2}   variant="medium" index={2} /></div>}
        {small1 && <div className="bento-small1" ><ArticleCard article={small1} variant="small"  index={3} /></div>}
        {small2 && <div className="bento-small2" ><ArticleCard article={small2} variant="small"  index={4} /></div>}
        {small3 && <div className="bento-wide"   ><ArticleCard article={small3} variant="wide"   index={5} /></div>}

        {articles.length === 0 && (
          <div className="col-span-4 flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--muted)] flex items-center justify-center mb-5">
              <span className="text-3xl">✦</span>
            </div>
            <p className="font-heading font-semibold text-[var(--foreground)] mb-2">Building your feed</p>
            <p className="text-sm text-[var(--foreground-secondary)] max-w-xs">
              Start reading to personalise this view for you.
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
