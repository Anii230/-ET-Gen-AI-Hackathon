import { Quote } from "lucide-react";
import Link from "next/link";

import { CategoryTag } from "@/components/ui/category-tag";

const miniCards = [
  {
    category: "AI",
    text: "GPT-5 reshapes AI research benchmarks worldwide",
  },
  {
    category: "Economy",
    text: "RBI signals sustained rate pause at 4.1% CPI",
  },
  {
    category: "Tech",
    text: "Jio unveils ₹40,000 Cr 6G roadmap",
  },
];

export function AuthDecorativePanel() {
  return (
    <div className="relative hidden w-[42%] flex-col overflow-hidden border-r border-border bg-background-secondary lg:flex">
      <div className="relative z-10 flex h-full flex-col p-10">
        <Link
          href="/"
          className="flex w-fit items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
            <span className="font-heading text-[10px] font-bold leading-none text-primary-foreground">
              ET
            </span>
          </span>
          <span className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
            ET AI
          </span>
        </Link>

        <div className="mt-auto mb-10 max-w-[320px]">
          <Quote
            className="mb-4 h-5 w-5 text-muted-foreground/50"
            aria-hidden
          />
          <p className="font-heading text-[20px] font-medium italic leading-snug text-foreground">
            Intelligence, delivered personally.
          </p>
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            ET AI · AI-Native News
          </p>
        </div>

        <div className="space-y-2">
          {miniCards.map((card) => (
            <div
              key={card.text}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3"
            >
              <CategoryTag className="flex-shrink-0">
                {card.category}
              </CategoryTag>
              <p className="line-clamp-1 flex-1 text-[12px] leading-snug text-muted-foreground">
                {card.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
