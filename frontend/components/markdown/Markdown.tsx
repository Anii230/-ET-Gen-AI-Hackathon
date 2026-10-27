"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { cn, decodeEntities } from "@/lib/utils";

/**
 * Shared, safe Markdown renderer for assistant output.
 *
 * Raw HTML is skipped entirely (`skipHtml`), so model output can never inject
 * markup. Publishing copy sometimes arrives with literal entities such as
 * `&#x20;`; those are decoded before parsing so they render as ordinary text.
 */
const components: Components = {
  h1: ({ children }) => (
    <h2 className="mb-2 mt-5 font-heading text-[18px] font-semibold leading-snug tracking-tight text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-5 font-heading text-[17px] font-semibold leading-snug tracking-tight text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-1.5 mt-3 text-[13px] font-semibold text-foreground first:mt-0">
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h5 className="mb-1 mt-3 text-[13px] font-semibold text-foreground first:mt-0">
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 className="mb-1 mt-3 text-[12.5px] font-semibold text-foreground first:mt-0">
      {children}
    </h6>
  ),
  p: ({ children }) => (
    <p className="my-2 break-words leading-relaxed first:mt-0 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="opacity-70">{children}</del>,
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-5 marker:text-muted-subtle">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-muted-subtle">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="break-words pl-0.5 [&>ol]:my-1 [&>p]:my-0 [&>ul]:my-1">
      {children}
    </li>
  ),
  a: ({ href, children }) => {
    const external = Boolean(href && /^https?:\/\//i.test(href));
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="break-words font-medium text-accent-soft-foreground underline decoration-accent/40 underline-offset-2 transition-colors hover:text-accent hover:decoration-accent"
      >
        {children}
      </a>
    );
  },
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.88em] text-foreground">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg border border-border bg-background/60 p-3 text-[12px] leading-relaxed [&>code]:bg-transparent [&>code]:p-0">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-accent/40 pl-3 text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-border" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-[12.5px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-border px-2.5 py-1.5 font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border px-2.5 py-1.5 align-top text-muted-foreground">
      {children}
    </td>
  ),
  // Publisher images inside model output are untrusted; keep the transcript
  // text-only rather than loading third-party pixels.
  img: () => null,
};

export function Markdown({
  content,
  className,
}: {
  content?: string | null;
  className?: string;
}) {
  if (!content) return null;

  return (
    <div className={cn("min-w-0 break-words", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
        skipHtml
      >
        {decodeEntities(content)}
      </ReactMarkdown>
    </div>
  );
}
