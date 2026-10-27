import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Your NEXUS feed: personalised news, AI briefings, and connected stories.",
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
