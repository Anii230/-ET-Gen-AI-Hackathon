import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-lg bg-muted motion-reduce:animate-none",
        className
      )}
    />
  );
}

export function FeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading stories"
      className="grid grid-cols-1 gap-3 md:grid-cols-3"
    >
      <div className="space-y-3 rounded-xl border border-border bg-card p-5 md:col-span-2 md:row-span-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="space-y-3 rounded-xl border border-border bg-card p-4"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
