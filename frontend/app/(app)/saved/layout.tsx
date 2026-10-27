import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved Stories",
  description: "Your saved NEXUS stories, gathered in one place.",
};

export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
