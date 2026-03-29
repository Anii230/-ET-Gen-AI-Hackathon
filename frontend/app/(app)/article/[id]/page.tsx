"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getArticle, getBriefing, sendChatMessage, Article } from "@/lib/api";
import { ArrowLeft, Clock, Bookmark, MessageSquare, X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { isBookmarked as checkIsBookmarked, toggleBookmark } from "@/lib/bookmarks";

export default function ArticlePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: string; content: string}>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    getArticle(id).then(data => {
      setArticle(data);
      setIsSaved(checkIsBookmarked(id));
      setLoading(false);
      
      // Fetch AI briefing after article loads
      getBriefing("demo_user", undefined, [id]).then(bData => {
        setBriefing(bData.briefing);
      }).catch(() => {});
    }).catch(() => {
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (article && chatOpen && chatMessages.length === 0) {
      setChatMessages([
        { role: 'assistant', content: `I've analysed the key points of "${article.headline}". Ask me anything about the implications, expert views, or specific details.` }
      ]);
    }
  }, [article, chatOpen, chatMessages.length]);

  async function handleArticleChat() {
    if (!chatInput.trim() || chatLoading || !article) return;
    const msg = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const data = await sendChatMessage("demo_user", msg, article.id);
      setChatMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble connecting. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  }

  function handleSave() {
    if (!article) return;
    const newState = toggleBookmark(article.id);
    setIsSaved(newState);
  }

  function renderMarkdown(text: string) {
    if (!text) return null;
    return text.replace(/\*\*/g, '').replace(/^- /gm, '• ').trim();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-[var(--foreground-secondary)]">Loading article...</div>
      </div>
    );
  }

  if (!article) {
    return <div className="p-8 text-center">Article not found.</div>;
  }

  return (
    <div className="relative px-6 py-10 max-w-[880px] min-h-screen" style={{ margin: '0 0 0 calc(10% + 10px)' }}>
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-indigo-400 transition-colors mb-8 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to feed
      </button>

      {/* Category + Time */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
          {article.category}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-[var(--foreground-secondary)]">
          <Clock className="w-3.5 h-3.5" />
          {article.read_time} min read
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-[36px] font-semibold leading-[1.2] tracking-tight text-[var(--foreground)] mb-6">
        {article.headline}
      </h1>

      {/* Meta + Actions */}
      <div className="flex items-center justify-between mb-8 pb-8 border-b border-[var(--border)]">
        <div className="text-sm text-[var(--foreground-secondary)]">
          <span className="font-medium text-[var(--foreground)]">{article.source}</span>
          <span className="mx-2 opacity-30">|</span>
          {new Date(article.published_at).toLocaleDateString()}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            title={isSaved ? "Remove bookmark" : "Save for later"}
            className={`p-2 rounded-lg border border-[var(--border)] transition-all cursor-pointer ${
              isSaved ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" : "text-[var(--foreground-secondary)] hover:bg-[var(--background-secondary)]"
            }`}
          >
            <Bookmark className={`w-4.5 h-4.5 ${isSaved ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Summary */}
        <p className="text-[18px] leading-relaxed text-[var(--foreground)] font-medium italic opacity-90 mb-8">
          {article.summary}
        </p>

        {/* AI Briefing */}
        {briefing && (
          <div className="my-10 p-6 rounded-xl bg-indigo-500/5 border-l-4 border-indigo-500/60 shadow-sm">
            <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              AI Intelligence Briefing
            </div>
            <div className="text-[16px] leading-[1.7] text-[var(--foreground)] opacity-95 whitespace-pre-wrap">
              {renderMarkdown(briefing)}
            </div>
            <button
              onClick={() => setChatOpen(true)}
              className="mt-6 flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Discuss this briefing in Chat
            </button>
          </div>
        )}

        {/* Read full article link */}
        <div className="py-8">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors font-medium border-b border-indigo-400/30 hover:border-indigo-300"
          >
            Read the full article at {new Date(article.published_at).getHours() > 0 ? article.source : "the source"}
          </a>
        </div>

        {/* Entities */}
        {article.entities && article.entities.length > 0 && (
          <div className="pt-8 mt-8 border-t border-[var(--border)]">
            <p className="text-[11px] font-bold text-[var(--foreground-secondary)] uppercase tracking-widest mb-4">Mentioned Entities</p>
            <div className="flex flex-wrap gap-2">
              {article.entities.map(e => (
                <span key={e} className="px-3 py-1 bg-[var(--background-secondary)] border border-[var(--border)] rounded-full text-xs text-[var(--foreground-secondary)]">
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Chat Panel */}
      {chatOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '420px',
          height: '760px',
          maxHeight: 'calc(100vh - 100px)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          background: 'var(--card)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          overflow: 'hidden',
        }}>
          {/* Chat Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card)',
            flexShrink: 0,
          }}>
            <div style={{ overflow: 'hidden' }}>
              <p style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--foreground)',
              }}>
                Article Chat
              </p>
              <p style={{
                fontSize: '11px',
                color: 'var(--muted-foreground)',
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '240px',
              }}>
                {article.headline}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => {
                  try {
                    sessionStorage.setItem('et_chat_carry', JSON.stringify({
                      articleId: article.id,
                      headline: article.headline,
                      messages: chatMessages,
                    }));
                  } catch(e) {}
                  router.push('/chat');
                }}
                className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--muted-foreground)] transition-colors cursor-pointer"
                title="Full screen chat"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--muted-foreground)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '82%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '14.5px',
                  lineHeight: '1.6',
                  ...(msg.role === 'user' ? {
                    background: '#4f46e5',
                    color: '#ffffff',
                  } : {
                    background: 'rgba(39,39,42,0.7)',
                    color: 'var(--foreground)',
                    border: '1px solid var(--border)',
                  })
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', gap: '4px', padding: '4px' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div style={{
            padding: '12px',
            borderTop: '1px solid var(--border)',
            background: 'var(--card)',
            flexShrink: 0,
          }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleArticleChat();
              }}
              style={{ display: 'flex', gap: '8px' }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask intelligence..."
                style={{
                  flex: 1,
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  color: 'var(--foreground)',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: chatLoading || !chatInput.trim() ? 0.6 : 1,
                }}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
