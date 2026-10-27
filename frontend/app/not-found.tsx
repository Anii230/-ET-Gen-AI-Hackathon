import Link from "next/link";

import { NexusWordmark } from "@/components/brand/NexusWordmark";
import { BRAND } from "@/lib/brand";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
      <div className="relative z-10 flex max-w-md flex-col items-center">
        <Link
          href="/"
          aria-label="NEXUS home"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <NexusWordmark size="lg" />
        </Link>

        <p className="mt-10 font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          404
        </p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          This story isn&apos;t here.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The page may have moved, or the link may be incomplete. Head back to{" "}
          {BRAND.name} to keep exploring.
        </p>

        <Link
          href="/home"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Return to {BRAND.name}
        </Link>
      </div>
    </main>
  );
}
