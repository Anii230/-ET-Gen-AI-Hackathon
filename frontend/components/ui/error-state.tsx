import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-14 text-center"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
      </div>
      <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
      {onRetry ? (
        <Button variant="outline" size="lg" className="mt-6" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
