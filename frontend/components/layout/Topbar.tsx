"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Search, Settings2 } from "lucide-react";
import { Popover } from "radix-ui";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { usePreferencesStore } from "@/lib/store/preferences";
import { createClient } from "@/lib/supabase/client";

export function Topbar() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("Guest");
  const openPreferences = usePreferencesStore((state) => state.openDialog);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!data.user) return;
        const email = data.user.email || "";
        const name =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          email.split("@")[0] ||
          "Guest";
        setUserEmail(email);
        setUserName(name);
      })
      .catch(() => {});
  }, [supabase]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    router.push(`/home/topic/${encodeURIComponent(term)}`);
    setSearchTerm("");
  };

  const handleSignOut = async () => {
    setProfileOpen(false);
    if (supabase) await supabase.auth.signOut();
    try {
      localStorage.removeItem("et_ai_onboarded");
      localStorage.removeItem("et_ai_bookmarks");
      localStorage.removeItem("et_ai_categories");
      localStorage.removeItem("et_ai_topics");
    } catch {
      // Ignore storage failures.
    }
    usePreferencesStore.getState().reset();
    router.push("/login");
  };

  return (
    <header className="flex h-[52px] flex-shrink-0 items-center gap-3 border-b border-border bg-background px-3 sm:px-4">
      <form
        onSubmit={handleSearch}
        role="search"
        className="relative min-w-0 max-w-[420px] flex-1"
      >
        <label htmlFor="topbar-search" className="sr-only">
          Search topics
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          id="topbar-search"
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search a topic…"
          autoComplete="off"
          className="w-full rounded-md border border-border bg-muted/60 py-1.5 pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-ring/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/25"
        />
      </form>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle size="sm" />

        <Popover.Root open={notifOpen} onOpenChange={setNotifOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Bell className="h-[18px] w-[18px]" aria-hidden />
              <span
                aria-hidden
                className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent"
              />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={8}
              collisionPadding={12}
              className="z-50 w-[280px] rounded-lg border border-border bg-popover text-popover-foreground shadow-popover outline-none"
            >
              <div className="border-b border-border px-4 py-2.5">
                <p className="text-[13px] font-semibold">Notifications</p>
              </div>
              <div className="space-y-3 px-4 py-3">
                <div className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent"
                  />
                  <div>
                    <p className="text-[13px] text-foreground">
                      Your For You feed has been updated
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      2 minutes ago
                    </p>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent"
                  />
                  <div>
                    <p className="text-[13px] text-foreground">
                      3 new stories match your interests
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      15 minutes ago
                    </p>
                  </div>
                </div>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <Popover.Root open={profileOpen} onOpenChange={setProfileOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {(userName[0] || "G").toUpperCase()}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={8}
              collisionPadding={12}
              className="z-50 w-[232px] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-popover outline-none"
            >
              <div className="border-b border-border px-4 py-3">
                <p className="truncate text-[13px] font-medium">{userName}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {userEmail || "Not signed in"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  openPreferences("edit");
                }}
                className="flex w-full items-center gap-2 border-b border-border px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
              >
                <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                Update preferences
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
              </button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </header>
  );
}
