"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SendHorizonal, TrendingUp, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { mockArticles, categoryStyles } from "@/lib/mock-data";
import { sendChatMessage, getBriefing, getFeed, Article } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: any[];
};

function SourcesAccordion({ sources }: { sources: any[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 rounded-lg border border-[var(--border)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)] transition-colors duration-200 cursor-pointer"
      >
        <span>{sources.length} Sources</span>
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
          {sources.map((s) => {
            // map predefined categories to mock data colors or default to indigo
            const cMap: Record<string, string> = { Technology: "indigo", Markets: "emerald", Economy: "amber" };
            const cColor = cMap[s.category] || "indigo";
            const style = categoryStyles[cColor] ?? categoryStyles.indigo;
            const title = s.headline || s.title || "Reference Article";
            return (
              <Link
                key={s.id}
                href={`/home/article/${s.id}`}
                className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--background-tertiary)] transition-colors duration-200 cursor-pointer"
              >
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 border ${style.pill} border-current/20`}>
                  {s.category}
                </span>
                <p className="text-[12px] text-[var(--foreground)] leading-snug line-clamp-1 flex-1">{title}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const Markdown = ({ content }: { content: string }) => {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="space-y-3">
      {lines.map((line, idx) => {
        // Headers (### Topic)
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400 mt-4 mb-2 first:mt-0">
              {line.replace('### ', '')}
            </h3>
          );
        }

        // Lists (- item)
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          const text = line.trim().substring(2);
          return (
            <div key={idx} className="flex gap-2 pl-2">
              <div className="w-1 h-1 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
              <p className="flex-1 text-[14px] leading-relaxed opacity-90">
                <InlineMarkdown text={text} />
              </p>
            </div>
          );
        }

        // Standard line
        if (line.trim() === '') return <br key={idx} />;

        return (
          <p key={idx} className="text-[14px] leading-relaxed">
            <InlineMarkdown text={line} />
          </p>
        );
      })}
    </div>
  );
};

const InlineMarkdown = ({ text }: { text: string }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </>
  );
};

export default function ChatPage() {
  const shouldReduceMotion = useReducedMotion();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! Ask me anything about today's news. I can give you briefings, explain market moves, or dig into any story."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextArticleId, setContextArticleId] = useState<string | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [carried, setCarried] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('et_chat_carry');
      if (raw) {
        const ctx = JSON.parse(raw);
        sessionStorage.removeItem('et_chat_carry');
        if (ctx.messages?.length > 0) {
          setMessages(ctx.messages);
        }
        if (ctx.articleId) {
          setContextArticleId(ctx.articleId);
        }
        setCarried(true);
      }
    } catch(e) {}
  }, []);

  useEffect(() => {
    if (carried) return;
    
    // Check for Navigator Selection
    const mode = searchParams.get("mode");
    if (mode === "navigate") {
      const raw = sessionStorage.getItem("et_navigator_selection");
      if (raw) {
        try {
          const selection = JSON.parse(raw);
          sessionStorage.removeItem("et_navigator_selection");
          if (selection.articleIds?.length > 0) {
            handleAutoSynthesis(selection.articleIds);
            return;
          }
        } catch(e) {}
      }
    }

    const articleId = searchParams.get("articleId");
    const headline = searchParams.get("headline");
    if (articleId && headline) {
      const decodedHeadline = decodeURIComponent(headline);
      setMessages([{
        role: "assistant", 
        content: `I'm ready to discuss this article:\n\n**${decodedHeadline}**\n\nWhat would you like to know? I can explain the key points, provide context, or answer specific questions.`
      }]);
      setContextArticleId(articleId);
    }
  }, [searchParams, carried]);

  async function handleAutoSynthesis(ids: string[]) {
    setLoading(true);
    setMessages([{
      role: "assistant",
      content: "Initialising your topic-wise intelligence briefing..."
    }]);
    
    try {
      const data = await getBriefing("demo_user", "TOPIC_WISE_SUMMARY", ids);
      // Fetch full article objects for the sources
      const allArticles = await getFeed();
      const sources = allArticles.filter(a => data.sources_used.includes(a.id));
      
      setMessages([
        {
          role: "assistant",
          content: data.briefing,
          sources: sources
        }
      ]);
    } catch (e) {
      setMessages([{
        role: "assistant",
        content: "Sorry, I couldn't synthesize your news selection. Please try again."
      }]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getFeed().then(data => setRelatedArticles(data.slice(0, 3)));
  }, []);

  async function handleSend() {
    if (!input.trim()) return;
    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);
    try {
      const data = await sendChatMessage(
        "demo_user", 
        userMessage,
        contextArticleId || undefined
      );
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: data.response,
        sources: data.sources
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I had trouble connecting. Please try again."
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full">
      {/* ── Conversation ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--border)]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--border)]">
          <h1 className="font-heading font-semibold text-[20px] text-[var(--foreground)]">News Navigator</h1>
          <p className="text-sm text-[var(--foreground-secondary)] mt-0.5">Ask anything about today's news</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut", delay: 0.05 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                style={
                  msg.role === 'user'
                    ? { 
                      backgroundColor: '#4f46e5',
                      color: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      maxWidth: '85%',
                    }
                    : {
                      backgroundColor: 'rgba(39, 39, 42, 0.8)',
                      color: '#e4e4e7',
                      border: '1px solid rgba(63, 63, 70, 0.5)',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      maxWidth: '85%',
                    }
                }
              >
                <Markdown content={msg.content} />
                {msg.sources && msg.sources.length > 0 && (
                  <SourcesAccordion sources={msg.sources} />
                )}
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-[var(--background-tertiary)] text-[var(--foreground)] rounded-bl-sm border border-[var(--border)]">
                <p className="text-[14px] leading-relaxed animate-pulse">...</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <input
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about any topic in today's news..."
              suppressHydrationWarning
              className="
                flex-1 px-4 py-2.5 rounded-xl
                bg-[var(--background-tertiary)] border border-[var(--border)]
                text-[14px] text-[var(--foreground)]
                placeholder:text-[var(--foreground-secondary)]
                focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40
                transition-all duration-200 ease-out
              "
            />
            <button
              id="chat-send-btn"
              onClick={handleSend}
              disabled={loading}
              aria-label="Send message"
              className="
                w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center flex-shrink-0
                transition-all duration-200 ease-out cursor-pointer
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40
              "
            >
              {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <SendHorizonal className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Context panel ────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col gap-4 w-[300px] flex-shrink-0 p-5 overflow-y-auto">
        {/* Active topic */}
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/8 p-4">
          <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-widest mb-2">Active Topic</p>
          <p className="text-[14px] font-heading font-medium text-[var(--foreground)]">India AI Policy Framework</p>
          <p className="text-[12px] text-[var(--foreground-secondary)] mt-1">Tracking 3 story threads · Updated 2h ago</p>
        </div>

        {/* Related articles */}
        <p className="text-[11px] font-semibold text-[var(--foreground-secondary)] uppercase tracking-widest">
          Related Articles
        </p>
        <div className="space-y-2">
          {relatedArticles.map((article) => (
            <div 
              key={article.id}
              onClick={() => router.push(`/home/article/${article.id}`)}
              className="p-3 rounded-lg border border-border 
                hover:border-border/80 cursor-pointer 
                transition-colors"
            >
              <span className="text-xs px-1.5 py-0.5 rounded-full 
                bg-indigo-500/10 text-indigo-400 
                border border-indigo-500/20">
                {article.category}
              </span>
              <p className="mt-1.5 text-sm font-medium line-clamp-2 
                leading-snug">
                {article.headline}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {article.source}
              </p>
            </div>
          ))}
        </div>

        {/* Story arc link */}
        <Link
          href="/trending"
          className="
            flex items-center justify-center gap-2 w-full
            py-2.5 rounded-xl border border-[var(--border)]
            text-[13px] font-medium text-[var(--foreground-secondary)]
            hover:border-[var(--border-hover)] hover:text-[var(--foreground)]
            transition-all duration-200 ease-out cursor-pointer
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40
          "
        >
          <TrendingUp className="w-4 h-4" />
          Story Arc
        </Link>
      </aside>
    </div>
  );
}
