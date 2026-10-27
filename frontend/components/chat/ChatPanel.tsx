"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, Loader2, Send, X } from "lucide-react";

import { Markdown } from "@/components/markdown/Markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Presentational chat surface shared by the article reader and topic page.
 * Conversation state stays with the caller so opening and closing the panel
 * never duplicates messages or starts a second conversation.
 */
export function ChatPanel({
  title,
  subtitle,
  messages,
  loading,
  input,
  onInputChange,
  onSend,
  onClose,
  onOpenFull,
  inputId,
  placeholder = "Ask a question…",
  className,
}: {
  title: string;
  subtitle: string;
  messages: ChatMessage[];
  loading: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
  onOpenFull?: () => void;
  inputId: string;
  placeholder?: string;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, loading]);

  return (
    <section
      role="dialog"
      aria-label={title}
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground">{title}</p>
          <p className="line-clamp-1 text-[11px] text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {onOpenFull ? (
            <button
              type="button"
              onClick={onOpenFull}
              aria-label="Open in full chat"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 custom-scrollbar"
        aria-live="polite"
        aria-busy={loading}
      >
        {messages.map((message, index) => {
          const isUser = message.role === "user";
          return (
            <div
              key={index}
              className={cn("flex", isUser ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "min-w-0 max-w-[88%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                  isUser
                    ? "rounded-br-sm bg-accent text-primary-foreground"
                    : "rounded-bl-sm border border-border bg-muted/50 text-foreground"
                )}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                ) : (
                  <Markdown content={message.content} />
                )}
              </div>
            </div>
          );
        })}

        {loading ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-xl rounded-bl-sm border border-border bg-muted/50 px-3.5 py-2.5">
              <Loader2
                className="h-3.5 w-3.5 animate-spin text-muted-foreground motion-reduce:animate-none"
                aria-hidden
              />
              <span className="text-[12px] text-muted-foreground">
                Thinking…
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <form
        className="mt-auto flex gap-2 border-t border-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          {placeholder}
        </label>
        <input
          id={inputId}
          type="text"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-ring/60 focus:outline-none focus:ring-2 focus:ring-ring/25"
        />
        <Button
          type="submit"
          size="icon-lg"
          disabled={loading || !input.trim()}
          aria-label="Send message"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
        </Button>
      </form>
    </section>
  );
}
