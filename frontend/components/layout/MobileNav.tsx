"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Compass, Home, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { icon: Home, label: "Home", href: "/home" },
  { icon: Compass, label: "Navigator", href: "/navigator" },
  { icon: Bookmark, label: "Saved", href: "/saved" },
  { icon: TrendingUp, label: "Arcs", href: "/trending" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              isActive ? "text-accent" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-[18px] w-[18px]" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
