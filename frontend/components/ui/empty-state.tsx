import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
      </div>
      <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
