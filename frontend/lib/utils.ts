import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  middot: "·",
  rupee: "₹",
};

/** Decode the small set of HTML entities that appears in RSS copy. */
export function decodeEntities(value?: string | null): string {
  if (!value) return "";
  let decoded = value;
  // Some feeds double-encode ("L&amp;amp;T"), so decode until stable. The loop
  // is capped to keep pathological input bounded; output is rendered as text.
  for (let pass = 0; pass < 3; pass += 1) {
    const next = decoded.replace(
      /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,
      (match, raw) => {
        const key = String(raw).toLowerCase();
        if (key.startsWith("#x")) {
          const code = Number.parseInt(key.slice(2), 16);
          return Number.isFinite(code) ? String.fromCodePoint(code) : match;
        }
        if (key.startsWith("#")) {
          const code = Number.parseInt(key.slice(1), 10);
          return Number.isFinite(code) ? String.fromCodePoint(code) : match;
        }
        return NAMED_ENTITIES[key] ?? match;
      }
    );
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

/** Strip tags from feed summaries without touching entity-encoded text. */
export function stripHtml(value?: string | null): string {
  if (!value) return "";
  return decodeEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Headlines arrive as plain text but can still contain RSS entities. */
export function formatHeadline(value?: string | null): string {
  return decodeEntities(value);
}

/** Short, locale-stable editorial date. */
export function formatPublishedAt(value?: string | null): string {
  if (!value) return "Recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  const now = new Date();
  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" };
  return date.toLocaleDateString("en-IN", options);
}

export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : plural ?? `${singular}s`;
}
