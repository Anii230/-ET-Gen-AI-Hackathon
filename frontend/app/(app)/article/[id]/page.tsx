import { redirect } from "next/navigation";

/**
 * Legacy article URL. The canonical reader lives at /home/article/[id]; keep
 * this route as a permanent redirect so older links and bookmarks still work.
 */
export default async function LegacyArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/home/article/${encodeURIComponent(id)}`);
}
