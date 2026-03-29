"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getArticle, getBriefing, Article, sendChatMessage } from "@/lib/api";
import { ArrowLeft, Clock, Bookmark, X, ExternalLink, Minimize2, Send, MessageSquare } from "lucide-react";
import { getBookmarks, toggleBookmark, isBookmarked } from "@/lib/bookmarks";


export default function ArticlePage() {
  const { id } = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [briefing, setBriefing] = useState<string>("");
  const [briefingLoading, setBriefingLoading] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: string, content: string}>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    getArticle(id as string)
      .then(setArticle)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (article) setBookmarked(isBookmarked(article.id));
  }, [article]);

  useEffect(() => {
    if (!article) return;
    setBriefingLoading(true);
    getBriefing("demo_user", undefined, [article.id])
      .then(data => setBriefing(data.briefing))
      .catch(() => setBriefing(""))
      .finally(() => setBriefingLoading(false));
  }, [article]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 
      text-muted-foreground text-sm">Loading article...</div>
  );

  if (!article) return (
    <div className="flex items-center justify-center h-64 
      text-muted-foreground text-sm">Article not found.</div>
  );

  const stripHtml = (html: string) => 
    html?.replace(/<[^>]*>/g, '').trim() || '';

  async function handleArticleChat() {
    if (!chatInput.trim() || chatLoading) return;
    const message = chatInput;
    setChatInput("");
    setChatMessages(prev => [
      ...prev, 
      { role: "user", content: message }
    ]);
    setChatLoading(true);
    try {
      const data = await sendChatMessage(
        "demo_user",
        message,
        article?.id
      );
      setChatMessages(prev => [
        ...prev,
        { role: "assistant", content: data.response }
      ]);
    } catch {
      setChatMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong." }
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function renderMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^- /gm, '• ')
      .replace(/^#{1,6} /gm, '')
      .trim();
  }

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
    }}>
      <div style={{ 
        padding: '32px 32px 32px 64px',
        maxWidth: '880px',
        width: '100%',
        overflowY: 'auto',
        margin: '0 auto 0 64px',
      }}>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
            {article.category}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {article.read_time}m read
          </span>
        </div>

        <h1 className="text-2xl font-semibold leading-tight mb-4 text-foreground">
          {article.headline}
        </h1>

        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <span className="text-sm text-muted-foreground">
            {article.source} · {new Date(article.published_at)
              .toLocaleDateString('en-IN', { 
                day: 'numeric', month: 'short', year: 'numeric' 
              })}
          </span>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                const next = toggleBookmark(article.id);
                setBookmarked(next);
              }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${bookmarked ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              <Bookmark className={`w-3 h-3 ${bookmarked ? 'fill-current' : ''}`} />
              {bookmarked ? 'Saved' : 'Save'}
            </button>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              Read full article →
            </a>
          </div>
        </div>

        <p className="text-base leading-relaxed text-foreground/80">
          {stripHtml(article.summary)}
        </p>

        <div className="mt-8 p-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span className="text-xs font-medium text-indigo-400 uppercase tracking-widest">AI Briefing</span>
          </div>
          {briefingLoading ? (
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay: '0ms'}} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay: '150ms'}} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay: '300ms'}} />
            </div>
          ) : briefing ? (
            <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
              {renderMarkdown(briefing)}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => {
              setChatOpen(true);
              if (chatMessages.length === 0) {
                setChatMessages([{
                  role: "assistant",
                  content: `I'm ready to discuss this article. What would you like to know?`
                }]);
              }
            }}
            className="text-xs px-3 py-1.5 rounded-full border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <MessageSquare className="w-3 h-3" />
            Discuss in Chat
          </button>
        </div>

        {article.entities && article.entities.length > 0 && (
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
              Key entities
            </p>
            <div className="flex flex-wrap gap-2">
              {article.entities.map((entity) => (
                <span key={entity} className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {entity}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

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
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium">Article Chat</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{article?.headline}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const context = {
                      articleId: article?.id,
                      headline: article?.headline,
                      messages: chatMessages,
                    };
                    try {
                      sessionStorage.setItem(
                        'et_chat_carry',
                        JSON.stringify(context)
                      );
                    } catch(e) {}
                    router.push('/chat');
                  }}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, i) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div style={
                      isUser
                        ? { 
                          backgroundColor: '#4f46e5',
                          color: '#ffffff',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          fontSize: '14.5px',
                          lineHeight: '1.5',
                          maxWidth: '85%',
                        }
                        : {
                          backgroundColor: 'rgba(39, 39, 42, 0.8)',
                          color: '#e4e4e7',
                          border: '1px solid rgba(63, 63, 70, 0.5)',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          fontSize: '14.5px',
                          lineHeight: '1.5',
                          maxWidth: '85%',
                        }
                    }>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-accent px-3 py-2 rounded-xl flex gap-1">
                    {[0,150,300].map(delay => (
                      <span key={delay}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                        style={{animationDelay: `${delay}ms`}}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border mt-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleArticleChat();
                    }
                  }}
                  placeholder="Ask about this article..."
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500/50 transition-colors"
                />
                <button
                  onClick={handleArticleChat}
                  disabled={chatLoading || !chatInput.trim()}
                  className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
        </div>
      )}


    </div>
  );
}
