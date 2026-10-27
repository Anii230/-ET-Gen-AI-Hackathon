import Link from "next/link";

import { NexusWordmark } from "@/components/brand/NexusWordmark";
import { BRAND } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Link
            href="/"
            aria-label="NEXUS home"
            className="flex items-center gap-2 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <NexusWordmark size="md" />
          </Link>
          <p className="text-xs text-muted-foreground">{BRAND.fullName}</p>
          <p className="text-xs text-muted-foreground">{BRAND.tagline}</p>
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center sm:items-end sm:text-right">
          <p className="text-xs font-medium text-foreground">{BRAND.descriptor}</p>
          <p className="text-xs text-muted-foreground">
            Built for Avataar.ai × Economic Times Hackathon 2026
          </p>
          <p className="text-[11px] text-muted-foreground/80">
            Track 8 — AI-Native News
          </p>
        </div>
      </div>
    </footer>
  );
}
