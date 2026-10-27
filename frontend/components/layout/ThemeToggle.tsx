"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface ThemeToggleProps {
  size?: "sm" | "md";
}

const emptySubscribe = () => () => {};

export function ThemeToggle({ size = "md" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  // False during SSR and the hydration render, true afterwards — without an
  // effect that would trigger an extra render pass.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <div
        aria-hidden
        className={`${
          size === "sm" ? "h-8 w-8" : "h-9 w-9"
        } rounded-md bg-muted`}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`
        ${size === "sm" ? "h-8 w-8" : "h-9 w-9"} flex items-center justify-center overflow-hidden rounded-md
        text-muted-foreground hover:bg-muted hover:text-foreground
        transition-colors cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
      `}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? "sun" : "moon"}
          initial={shouldReduceMotion ? {} : { rotate: -30, scale: 0.7, opacity: 0 }}
          animate={shouldReduceMotion ? {} : { rotate: 0, scale: 1, opacity: 1 }}
          exit={shouldReduceMotion ? {} : { rotate: 30, scale: 0.7, opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {isDark ? (
            <Sun className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
          ) : (
            <Moon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
