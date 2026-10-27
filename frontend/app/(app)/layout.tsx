"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { PreferencesDialog } from "@/components/feed/PreferencesDialog";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <a
        href="#app-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-popover focus:px-3 focus:py-2 focus:text-sm focus:text-popover-foreground focus:shadow-popover"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main
          id="app-content"
          className="flex-1 overflow-y-auto overscroll-contain pb-16 md:pb-0"
        >
          {children}
        </main>
      </div>
      <MobileNav />
      <PreferencesDialog />
    </div>
  );
}
