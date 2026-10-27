"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Compass,
  Home,
  TrendingUp,
} from "lucide-react";

import { NexusWordmark } from "@/components/brand/NexusWordmark";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { getTrendingTopics } from "@/lib/api";
import { useSidebarStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", href: "/home" },
  { icon: Compass, label: "Navigator", href: "/navigator" },
  { icon: Bookmark, label: "Saved", href: "/saved" },
  { icon: TrendingUp, label: "Story Arcs", href: "/trending" },
];

export function Sidebar() {
  const { isCollapsed, toggle } = useSidebarStore();
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  const [topics, setTopics] = useState<
    Array<{ label: string; type: string; count: number }>
  >([]);

  useEffect(() => {
    getTrendingTopics()
      .then((data) => setTopics(data.topics.slice(0, 8)))
      .catch(() => {});
  }, []);

  return (
    <motion.aside
      layout={!shouldReduceMotion}
      animate={{ width: isCollapsed ? 64 : 248 }}
      initial={false}
      transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" }}
      className="relative z-30 hidden flex-shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex"
    >
      <div className="flex h-[52px] flex-shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
        <Link
          href="/home"
          aria-label="NEXUS home"
          title={isCollapsed ? "NEXUS" : undefined}
          className="flex min-w-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <NexusWordmark size="sm" showName={!isCollapsed} />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main navigation">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "group relative flex h-9 items-center gap-3 rounded-md border-l-2 px-2.5 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  isCollapsed && "justify-center px-0",
                  isActive
                    ? "border-accent bg-sidebar-accent text-sidebar-accent-foreground"
                    : "border-transparent text-sidebar-foreground/70 hover:bg-muted hover:text-sidebar-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] flex-shrink-0",
                    isActive
                      ? "text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                  )}
                />
                {!isCollapsed && (
                  <span className="truncate text-[13.5px] font-medium">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {topics.length > 0 && !isCollapsed && (
          <div className="mt-5 px-1">
            <p className="mb-2 px-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Trending
            </p>
            <div className="space-y-0.5">
              {topics.map((topic) => (
                <Link
                  key={topic.label}
                  href={`/home/topic/${encodeURIComponent(topic.label)}`}
                  className="flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-1.5 w-1.5 flex-shrink-0 rounded-full",
                      topic.type === "entity" ? "bg-accent" : "bg-muted-foreground/50"
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground/80">
                    {topic.label}
                  </span>
                  <span className="flex-shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {topic.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="flex flex-col gap-1 border-t border-sidebar-border px-2 py-3">
        <div
          className={cn(
            "flex items-center gap-2 rounded-md px-1.5 py-1",
            isCollapsed ? "justify-center" : "justify-between"
          )}
        >
          {!isCollapsed && (
            <span className="text-[12px] text-muted-foreground">Appearance</span>
          )}
          <ThemeToggle size="sm" />
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex h-8 items-center gap-2 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            isCollapsed ? "justify-center px-0" : "px-2"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-[12px] font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
