"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A publisher image with a restrained fallback.
 *
 * The parent owns the aspect ratio; this component fills it with a cover crop.
 * Missing, blocked and slow images all fall back to the same quiet surface, so
 * a broken feed URL never produces a broken-image icon.
 */
export function ArticleThumbnail({
  src,
  alt = "",
  sizes,
  priority = false,
  tone = "default",
  className,
}: {
  src?: string | null;
  alt?: string;
  sizes: string;
  priority?: boolean;
  tone?: "default" | "dark";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const hasImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden",
        tone === "dark" ? "bg-[#11111b]" : "bg-muted",
        className
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          tone === "dark"
            ? "bg-[radial-gradient(120%_120%_at_20%_0%,rgba(137,220,235,0.16),transparent_55%),linear-gradient(145deg,#181825,#11111b)]"
            : "bg-[radial-gradient(120%_120%_at_20%_0%,var(--accent-soft),transparent_60%)]"
        )}
      >
        <ImageOff
          className={cn(
            "h-6 w-6",
            tone === "dark" ? "text-white/25" : "text-muted-subtle/60"
          )}
          aria-hidden
        />
      </div>

      {hasImage ? (
        <Image
          src={src as string}
          alt={alt}
          fill
          sizes={sizes}
          preload={priority}
          quality={78}
          className={cn(
            "z-10 object-cover transition-opacity duration-500 motion-reduce:transition-none",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}
