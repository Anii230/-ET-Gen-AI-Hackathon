import type { Metadata } from "next";

import { BRAND } from "@/lib/brand";

type TopicLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ label: string }>;
};

export async function generateMetadata({
  params,
}: Pick<TopicLayoutProps, "params">): Promise<Metadata> {
  const { label } = await params;

  let title = label;
  try {
    title = decodeURIComponent(label);
  } catch {
    // Keep the route label as-is if it is not valid percent-encoding.
  }

  return {
    title: { absolute: `${title} — ${BRAND.name}` },
    description:
      "Explore connected coverage, multiple perspectives, and an AI-generated topic briefing from NEXUS.",
  };
}

export default function TopicLayout({ children }: TopicLayoutProps) {
  return <>{children}</>;
}
