"use client";

import { useRef } from "react";

const TABS = [
  { id: "general", label: "General" },
  { id: "foryou", label: "For You" },
] as const;

type FeedTab = (typeof TABS)[number]["id"];

export function FeedToggle({
  activeTab,
  onChange,
}: {
  activeTab: FeedTab;
  onChange: (tab: FeedTab) => void;
}) {
  const refs = useRef<Record<FeedTab, HTMLButtonElement | null>>({
    general: null,
    foryou: null,
  });

  const move = (direction: 1 | -1) => {
    const index = TABS.findIndex((tab) => tab.id === activeTab);
    const next = TABS[(index + direction + TABS.length) % TABS.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Feed"
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          move(1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          move(-1);
        }
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              refs.current[tab.id] = node;
            }}
            type="button"
            role="tab"
            id={`feed-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls="feed-panel"
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`rounded-[6px] px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
