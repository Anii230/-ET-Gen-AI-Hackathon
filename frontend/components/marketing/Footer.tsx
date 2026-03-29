import Link from "next/link";
import { Zap } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border py-10 px-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo + tagline */}
        <div className="flex flex-col items-center sm:items-start gap-1">
          <Link
            href="/"
            className="flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          >
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-heading font-bold text-base tracking-tight">
              ET <span className="text-primary">AI</span>
            </span>
          </Link>
          <p className="text-xs text-muted-foreground">
            News that knows you.
          </p>
        </div>

        {/* Hackathon attribution */}
        <p className="text-xs text-muted-foreground text-center sm:text-right">
          Built for{" "}
          <span className="text-foreground font-medium">ET AI Hackathon 2026</span>
          {" "}· Track 8 — AI-Native News
        </p>
      </div>
    </footer>
  );
}
