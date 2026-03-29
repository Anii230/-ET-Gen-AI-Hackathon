"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface ThemeToggleProps {
  size?: "sm" | "md";
}

export function ThemeToggle({ size = "md" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div
        className={`${size === "sm" ? "w-8 h-8" : "w-9 h-9"} rounded-lg bg-[var(--muted)] animate-pulse`}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`
        ${size === "sm" ? "w-8 h-8" : "w-9 h-9"} rounded-lg
        flex items-center justify-center overflow-hidden
        text-[var(--foreground-secondary)] hover:text-[var(--foreground)]
        hover:bg-[var(--background-tertiary)]
        transition-colors duration-200 ease-out cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40
      `}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? "sun" : "moon"}
          initial={shouldReduceMotion ? {} : { rotate: -30, scale: 0.7, opacity: 0 }}
          animate={shouldReduceMotion ? {} : { rotate: 0, scale: 1, opacity: 1 }}
          exit={shouldReduceMotion ? {} : { rotate: 30, scale: 0.7, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {isDark
            ? <Sun className={size === "sm" ? "w-4 h-4" : "w-5 h-5"} />
            : <Moon className={size === "sm" ? "w-4 h-4" : "w-5 h-5"} />
          }
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
