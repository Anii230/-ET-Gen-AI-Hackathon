import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "News Chat",
  description:
    "Ask questions about the news and explore connected stories with NEXUS.",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
