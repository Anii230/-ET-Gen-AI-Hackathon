import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Story Arcs",
  description:
    "Follow developing stories over time, with timelines, key players, and sentiment shifts from NEXUS.",
};

export default function TrendingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
