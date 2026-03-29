"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, useEffect } from "react";
import { UserCheck, Cpu, BookOpen } from "lucide-react";

const EASE = "easeOut" as const;

const steps = [
  {
    icon: UserCheck,
    number: "01",
    title: "Tell us what you follow",
    description:
      "Select your topics, sources, and depth preferences. Takes 60 seconds.",
  },
  {
    icon: Cpu,
    number: "02",
    title: "Agents enrich and rank stories",
    description:
      "AI agents fetch, synthesise and rank stories based on your signal profile.",
  },
  {
    icon: BookOpen,
    number: "03",
    title: "You read, we learn",
    description:
      "Every read, skip, and save trains your feed to be smarter over time.",
  },
];

export function HowItWorks() {
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef(null);
  const lineRef = useRef<SVGPathElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  useEffect(() => {
    if (inView && lineRef.current && !shouldReduceMotion) {
      lineRef.current.classList.add("is-visible");
    }
  }, [inView, shouldReduceMotion]);

  return (
    <section id="how-it-works" className="py-24 px-4 bg-muted/30" ref={sectionRef}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={inView && !shouldReduceMotion ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: EASE }}
          className="text-center mb-20"
        >
          <p className="text-sm font-medium text-primary mb-3 uppercase tracking-widest">
            How it works
          </p>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl text-foreground tracking-tight">
            From noise to signal,
            <br className="hidden sm:block" /> in seconds
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* SVG connecting line — desktop only */}
          <div className="hidden lg:block absolute top-12 left-[16.5%] right-[16.5%] h-px pointer-events-none">
            <svg
              className="w-full h-8"
              viewBox="0 0 600 20"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                ref={lineRef}
                d="M 0 10 Q 150 0 300 10 Q 450 20 600 10"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                className="draw-line text-primary/40"
              />
            </svg>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                animate={inView && !shouldReduceMotion ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.5,
                  ease: EASE,
                  delay: i * 0.15,
                }}
                className="flex flex-col items-center text-center group"
              >
                {/* Icon circle */}
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-card border border-border group-hover:border-primary/40 flex items-center justify-center transition-all duration-200 shadow-sm">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                </div>

                <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-[240px]">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
