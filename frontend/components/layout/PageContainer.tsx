import { cn } from "@/lib/utils";

type Width = "wide" | "reading" | "narrow";

const widths: Record<Width, string> = {
  // Wide editorial pages (Home, Navigator, Story Arcs, Saved).
  wide: "max-w-[1560px]",
  // Long-form pages that may also host a side panel.
  reading: "max-w-[1400px]",
  // Focused utility pages (errors, short forms).
  narrow: "max-w-[900px]",
};

/**
 * The single horizontal rhythm for app pages.
 *
 * The sidebar and topbar live in the app shell, so this only owns the
 * content gutters. Keeping the widths here avoids per-page max-width drift.
 */
export function PageContainer({
  width = "wide",
  className,
  children,
}: {
  width?: Width;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        widths[width],
        className
      )}
    >
      {children}
    </div>
  );
}
