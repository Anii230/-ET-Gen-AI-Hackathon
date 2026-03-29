"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useSidebarStore } from "@/lib/store";
import { getTrendingTopics } from "@/lib/api";
import {
  Home,
  MessageSquare,
  Bookmark,
  TrendingUp,
  Compass,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";

const navItems = [
  { icon: Home,          label: "Home",        href: "/home"      },
  { icon: Compass,       label: "Navigator",   href: "/navigator" },
  { icon: Bookmark,      label: "Saved",       href: "/saved"     },
  { icon: TrendingUp,    label: "Story Arcs",  href: "/trending"  },
];

export function Sidebar() {
  const { isCollapsed, toggle } = useSidebarStore();
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [topics, setTopics] = useState<Array<{label: string; type: string; count: number}>>([]);

  useEffect(() => {
    setMounted(true);
    getTrendingTopics()
      .then(data => setTopics(data.topics.slice(0, 8)))
      .catch(() => {});
  }, []);

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  return (
    <motion.aside
      layout={!shouldReduceMotion}
      animate={{ width: isCollapsed ? 64 : 260 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex-shrink-0 flex flex-col bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] overflow-hidden relative z-30"
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 h-[52px] border-b border-[var(--sidebar-border)] flex-shrink-0">
        <div className="w-6 h-6 rounded-md bg-indigo-600 flex-shrink-0 flex items-center justify-center">
          <span className="font-heading font-bold text-xs text-white leading-none">ET</span>
        </div>
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.span
              key="logo-text"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="font-heading font-bold text-[15px] tracking-tight whitespace-nowrap overflow-hidden"
            >
              ET{" "}
              <span className="text-indigo-500">AI</span>
              <span className="text-indigo-500">·</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Nav items ────────────────────────────────────── */}
      <nav
        className="flex-1 py-3 px-2 space-y-0.5"
        aria-label="Main navigation"
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              title={isCollapsed ? item.label : undefined}
              className={`
                group relative flex items-center gap-3 h-10 rounded-lg
                transition-all duration-200 ease-out cursor-pointer overflow-hidden
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40
                ${isCollapsed ? "px-0 justify-center" : "px-3"}
                ${isActive
                  ? "border-l-2 border-indigo-500 bg-[var(--sidebar-accent)] text-indigo-400 dark:text-indigo-300"
                  : "border-l-2 border-transparent text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)] hover:text-[var(--foreground)]"
                }
              `}
            >
              <item.icon
                className={`w-[20px] h-[20px] flex-shrink-0 transition-colors duration-200
                  ${isActive ? "text-indigo-500" : "text-[var(--foreground-secondary)] group-hover:text-[var(--foreground)]"}
                `}
              />

              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.span
                    key={`label-${item.href}`}
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="text-[14.5px] font-medium whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Tooltip on collapsed */}
              {isCollapsed && (
                <div
                  role="tooltip"
                  className="
                    absolute left-full ml-2.5 px-2 py-1
                    bg-[var(--popover)] border border-[var(--border)]
                    rounded-md text-xs font-medium text-[var(--foreground)]
                    whitespace-nowrap opacity-0 group-hover:opacity-100
                    pointer-events-none z-50 shadow-lg
                    transition-opacity duration-150
                  "
                >
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}

        {topics.length > 0 && !isCollapsed && (
          <div className="px-3 mt-4">
            <p style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--muted-foreground)',
              marginBottom: '8px',
              paddingLeft: '8px',
            }}>
              Trending
            </p>
            <div style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
              {topics.map((topic) => (
                <button
                  key={topic.label}
                  onClick={() => router.push(
                    `/home/topic/${encodeURIComponent(topic.label)}`
                  )}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 
                      'var(--accent)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 
                      'transparent';
                  }}
                >
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: topic.type === 'entity' 
                      ? '#6366f1' : '#10b981',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: '13px',
                    color: 'var(--foreground)',
                    opacity: 0.8,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingRight: '4px',
                  }}>
                    {topic.label}
                  </span>
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '10px',
                    color: 'var(--muted-foreground)',
                    flexShrink: 0,
                  }}>
                    {topic.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* ── Bottom ───────────────────────────────────────── */}
      <div className="py-3 px-2 border-t border-[var(--sidebar-border)] flex flex-col gap-1">
        {/* User avatar */}
        {/* Theme toggle */}
        <div className={`flex ${isCollapsed ? "justify-center" : "px-1"}`}>
          {!mounted ? (
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '12px',
              color: 'var(--muted-foreground)',
              width: isCollapsed ? 'auto' : '100%',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              opacity: 0,
            }}>
              <span style={{width: '14px', height: '14px'}} />
              {!isCollapsed && <span>Theme</span>}
            </button>
          ) : (
            <button
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--muted-foreground)',
                width: isCollapsed ? 'auto' : '100%',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
              }}
            >
              {resolvedTheme === 'dark' ? (
                <>
                  <Sun style={{width: '14px', height: '14px', flexShrink: 0}} />
                  {!isCollapsed && <span>Light mode</span>}
                </>
              ) : (
                <>
                  <Moon style={{width: '14px', height: '14px', flexShrink: 0}} />
                  {!isCollapsed && <span>Dark mode</span>}
                </>
              )}
            </button>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`
            flex items-center gap-2 h-9 rounded-lg
            text-[var(--foreground-secondary)] hover:text-[var(--foreground)]
            hover:bg-[var(--background-tertiary)]
            transition-all duration-200 ease-out cursor-pointer
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40
            ${isCollapsed ? "justify-center px-0" : "px-3"}
          `}
        >
          {isCollapsed
            ? <ChevronRight className="w-4 h-4" />
            : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[12px] font-medium">Collapse</span>
              </>
            )
          }
        </button>
      </div>
    </motion.aside>
  );
}
