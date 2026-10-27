import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Article imagery comes from publishers' own CDNs, so the host set changes
    // as the newsroom ingests new feeds. URLs are supplied by the backend, not
    // by readers. SVG stays disabled because the optimizer never renders it as
    // HTML, but restricting it keeps the image endpoint free of active content.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    dangerouslyAllowSVG: false,
    // Next 16 requires an explicit quality allowlist. Card art uses 78; keep
    // the default 75 available for any future callers.
    qualities: [75, 78],
  },
};

export default nextConfig;
