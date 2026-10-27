import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

type WordmarkSize = "sm" | "md" | "lg" | "hero";

const SIZES: Record<
  WordmarkSize,
  {
    gap: string;
    mark: string;
    glyph: string;
    text: string;
    weight: string;
    dot: string;
  }
> = {
  sm: {
    gap: "gap-2",
    mark: "h-6 w-6 rounded-md",
    glyph: "h-3.5 w-3.5",
    text: "text-[13px] tracking-[0.18em]",
    weight: "font-semibold",
    dot: "h-1 w-1",
  },
  md: {
    gap: "gap-2.5",
    mark: "h-7 w-7 rounded-md",
    glyph: "h-4 w-4",
    text: "text-[15px] tracking-[0.18em]",
    weight: "font-semibold",
    dot: "h-1 w-1",
  },
  lg: {
    gap: "gap-3",
    mark: "h-9 w-9 rounded-lg",
    glyph: "h-5 w-5",
    text: "text-[18px] tracking-[0.16em]",
    weight: "font-semibold",
    dot: "h-1.5 w-1.5",
  },
  hero: {
    gap: "gap-4",
    mark: "h-14 w-14 rounded-2xl",
    glyph: "h-7 w-7",
    text: "text-5xl sm:text-6xl md:text-7xl lg:text-[7rem] tracking-[0.06em]",
    weight: "font-black",
    dot: "h-2 w-2 lg:h-2.5 lg:w-2.5",
  },
};

export interface NexusWordmarkProps {
  size?: WordmarkSize;
  showMark?: boolean;
  showName?: boolean;
  className?: string;
  markClassName?: string;
  textClassName?: string;
}

/**
 * Shared NEXUS wordmark.
 *
 * The connected-node mark is intentionally restrained: five nodes and a
 * single N-shaped path, using the existing primary/accent tokens. The word
 * remains plain text so it stays crisp and readable at every size.
 */
export function NexusWordmark({
  size = "md",
  showMark = true,
  showName = true,
  className,
  markClassName,
  textClassName,
}: NexusWordmarkProps) {
  const styles = SIZES[size];

  return (
    <span
      className={cn(
        "inline-flex select-none items-center text-foreground",
        styles.gap,
        className
      )}
    >
      {showMark && (
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex flex-shrink-0 items-center justify-center bg-primary text-primary-foreground",
            styles.mark,
            markClassName
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className={styles.glyph}
            aria-hidden="true"
          >
            <path
              d="M6 17V7l12 10V7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="6" cy="7" r="2" fill="currentColor" />
            <circle cx="6" cy="17" r="2" fill="currentColor" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <circle cx="18" cy="7" r="2" fill="currentColor" />
            <circle cx="18" cy="17" r="2" fill="currentColor" />
          </svg>
        </span>
      )}

      {showName ? (
        <span
          className={cn(
            "inline-flex items-center whitespace-nowrap font-heading uppercase leading-none",
            styles.weight,
            styles.text,
            textClassName
          )}
        >
          {BRAND.name}
          <span
            aria-hidden="true"
            className={cn(
              "ml-[0.2em] inline-block rounded-full bg-accent",
              styles.dot
            )}
          />
        </span>
      ) : (
        <span className="sr-only">{BRAND.name}</span>
      )}
    </span>
  );
}
