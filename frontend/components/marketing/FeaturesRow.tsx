"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { Brain, Layers, GitBranch } from "lucide-react";

const EASE = "easeOut" as const;

const features = [
  {
    icon: Brain,
    title: "Personalised feed",
    description:
      "AI agents rank and curate stories based on your reading patterns, interests, and the depth you prefer.",
  },
  {
    icon: Layers,
    title: "Deep briefings",
    description:
      "Multi-article synthesis gives you full context on any topic — not just headlines, but the story behind the story.",
  },
  {
    icon: GitBranch,
    title: "Story arc tracker",
    description:
      "Follow how a story evolves over days and weeks. Never lose the thread on developing narratives.",
  },
];

export function FeaturesRow() {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-24 px-4" ref={ref}>
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={inView && !shouldReduceMotion ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: EASE }}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-primary mb-3 uppercase tracking-widest">
            Intelligence built in
          </p>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl text-foreground tracking-tight">
            Everything you need to
            <br className="hidden sm:block" /> stay ahead
          </h2>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
              animate={inView && !shouldReduceMotion ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                ease: EASE,
                delay: i * 0.1,
              }}
              className="group relative rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] p-8 hover:border-[var(--border-hover)] transition-all duration-200 cursor-default"
            >
              {/* Number */}
              <div className="absolute top-6 right-6 text-5xl font-heading font-bold text-[var(--foreground)] opacity-[0.04] select-none">
                {String(i + 1).padStart(2, "0")}
              </div>

              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6">
                <feature.icon className="w-5 h-5 text-indigo-500" />
              </div>

              <h3 className="font-heading font-semibold text-xl text-[var(--foreground)] mb-3">
                {feature.title}
              </h3>
              <p className="text-[var(--foreground-secondary)] text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
