import type { Metadata } from "next";

import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: { absolute: `Article — ${BRAND.name}` },
  description:
    "Read the full story with source context, NLP analysis, and a focused NEXUS briefing.",
};

export default function HomeArticleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
