"use client";

const TABS = [
  { id: "general", label: "General" },
  { id: "foryou",  label: "For You" },
] as const;

export function FeedToggle({ activeTab, onChange }: { activeTab: "general" | "foryou", onChange: (tab: "general" | "foryou") => void }) {
  return (
    <div
      role="tablist"
      aria-label="Feed filter"
      className="flex items-center gap-1 p-1 rounded-full bg-[var(--background-tertiary)] border border-[var(--border)]"
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`
              relative px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ease-out cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50
              ${isActive
                ? "bg-indigo-600 text-white shadow-sm border border-transparent"
                : "bg-transparent border border-black/10 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-[var(--foreground)]"
              }
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
