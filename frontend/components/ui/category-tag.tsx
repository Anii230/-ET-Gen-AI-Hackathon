import { cn } from "@/lib/utils";

/**
 * A single, restrained category label. The taxonomy is large, so colour is
 * reserved for state (selected, error, success) rather than 18 competing hues.
 */
export function CategoryTag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[5px] border border-border bg-tag px-2 py-0.5",
        "text-[10px] font-semibold uppercase tracking-[0.14em] text-tag-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}
