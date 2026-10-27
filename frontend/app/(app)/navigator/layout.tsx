import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "News Navigator",
  description:
    "Select stories across domains and build a custom NEXUS intelligence briefing.",
};

export default function NavigatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
