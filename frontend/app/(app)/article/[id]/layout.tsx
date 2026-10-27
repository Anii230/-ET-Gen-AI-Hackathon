import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Article",
  description:
    "Read the full story with source context, NLP analysis, and a focused NEXUS briefing.",
};

export default function ArticleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
