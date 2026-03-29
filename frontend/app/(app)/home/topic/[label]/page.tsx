"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  getTopicBriefing, 
  getArticle, 
  Article, 
  TopicBriefing, 
  sendChatMessage 
} from "@/lib/api";
import { 
  ArrowLeft, 
  Clock, 
  Bookmark, 
  X, 
  ExternalLink, 
  Send, 
  MessageSquare, 
  Minimize2,
  Brain, 
  Target, 
  TrendingUp,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function stripHtml(html: string) {
  return html?.replace(/<[^>]*>/g, '').trim() || '';
}

export default function TopicPage() {
  const { label } = useParams();
  const router = useRouter();
  const topicLabel = decodeURIComponent(label as string);

  const [briefing, setBriefing] = useState<TopicBriefing | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState<Array<{role: string, content: string}>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!topicLabel) return;
    
    setLoading(true);
    getTopicBriefing(topicLabel)
      .then(async (data) => {
        setBriefing(data);
        // Fetch article details for the top IDs
        const details = await Promise.all(
          data.article_ids.slice(0, 5).map(id => getArticle(id).catch(() => null))
        );
        const validArticles = details.filter((a): a is Article => a !== null);
        setArticles(validArticles);

        // Pre-populate chat with context
        setChatMessages([{
          role: "assistant",
          content: `I've analyzed ${data.total_articles} articles regarding "${topicLabel}". How can I help you navigate these developments?`
        }]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [topicLabel]);

  async function handleTopicChat() {
    if (!chatInput.trim() || chatLoading) return;
    const message = chatInput;
    const activeAngle = briefing?.angles[activeTabIndex]?.angle || "General";
    
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: message }]);
    setChatLoading(true);
    
    try {
      // Create a context-heavy message
      const contextPrefix = `[Context: User investigating Topic "${topicLabel}", focusing on "${activeAngle}". Top Articles: ${articles.slice(0, 3).map(a => a.headline).join("; ")}] `;
      
      const data = await sendChatMessage(
        "demo_user",
        contextPrefix + message,
        articles[0]?.id
      );
      setChatMessages(prev => [
        ...prev,
        { role: "assistant", content: data.response }
      ]);
    } catch {
      setChatMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that request." }
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
      <p className="text-muted-foreground text-sm font-medium animate-pulse">
        Synthesizing intelligence for {topicLabel}...
      </p>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
    }}>
      {/* Scrollable Content Area */}
      <div style={{ 
        padding: '32px 32px 32px 84px',
        maxWidth: '1000px',
        width: '100%',
        overflowY: 'auto',
        margin: '0 auto 0 0',
      }}>
        <div className="max-w-[800px]">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all mb-8 group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>

          {/* Minimalist Topic Header */}
          <header className="mb-8">
            <h1 className="text-[24px] font-semibold text-foreground tracking-tight mb-2">
              {topicLabel}
            </h1>
            <p className="text-[13px] text-muted-foreground">
              {briefing?.total_articles || 0} Articles Analyzed · Across {briefing?.angles.length || 0} Key Perspectives
            </p>
          </header>

          {/* Angle Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {briefing?.angles.map((angle, i) => (
              <button
                key={i}
                onClick={() => setActiveTabIndex(i)}
                className={`px-4 py-2 rounded-full text-[13px] font-medium border transition-all cursor-pointer ${
                  activeTabIndex === i
                    ? "bg-indigo-500/5 border-indigo-500/30 text-indigo-400"
                    : "bg-transparent border-border text-muted-foreground hover:border-indigo-500/20 hover:text-foreground"
                }`}
              >
                {angle.angle}
              </button>
            ))}
          </div>

          {/* Combined AI Intelligence Briefing */}
          <section className="mb-14 p-8 rounded-[24px] bg-indigo-500/[0.03] border border-indigo-500/15 relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400">AI Briefing</span>
            </div>

            <div className="space-y-6 relative z-10">
              {briefing?.angles[activeTabIndex] && (
                <motion.div 
                  key={activeTabIndex}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-4"
                >
                  <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">{briefing.angles[activeTabIndex].angle}</h3>
                  <p className="text-[15px] leading-[1.75] text-foreground/80 font-medium">
                    {briefing.angles[activeTabIndex].content}
                  </p>
                </motion.div>
              )}
            </div>

            {activeTabIndex === briefing?.angles.length && briefing?.what_to_watch && (
              <div className="mt-8 pt-6 border-t border-indigo-500/10">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400/60 mb-3">Strategic Outlook</h4>
                <p className="text-[14px] font-medium italic text-muted-foreground leading-relaxed">
                  {briefing.what_to_watch}
                </p>
              </div>
            )}
          </section>

          {/* Article Grid Section */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-[13px] font-black text-foreground uppercase tracking-[0.2em]">Source Documentation</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {articles.map((article) => (
                <motion.div
                  key={article.id}
                  whileHover={{ y: -2, scale: 1.005 }}
                  onClick={() => router.push(`/home/article/${article.id}`)}
                  className="p-5 rounded-[20px] bg-card/40 border border-border hover:border-indigo-500/30 transition-all cursor-pointer group flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">{article.source}</span>
                    <span className="text-[10px] text-muted-foreground/60">{new Date(article.published_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-[15px] font-bold leading-tight group-hover:text-indigo-500 transition-colors">
                    {article.headline}
                  </h3>
                  <p className="text-[13px] text-muted-foreground/80 line-clamp-1">
                    {article.summary.replace(/<[^>]*>/g, '')}
                  </p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Key Entities Row */}
          {briefing?.key_entities && briefing.key_entities.length > 0 && (
            <section className="mb-12 pt-8 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {briefing.key_entities.map((entity) => (
                  <span 
                    key={entity} 
                    className="text-[11px] px-3 py-1.5 rounded-full bg-muted/30 text-muted-foreground border border-border/50 font-bold hover:bg-muted hover:text-foreground transition-colors cursor-default uppercase tracking-wider"
                  >
                    {entity}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Persistent Floating Chat (Match Article Page Exactly) */}
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
              <p className="text-sm font-medium">Intelligence Chat</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{topicLabel} Context</p>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <Minimize2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {chatMessages.map((msg, i) => {
              const isUser = msg.role === 'user';
              if (msg.content.startsWith('[Context:')) return null; // Hide system context
              
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
                    handleTopicChat();
                  }
                }}
                placeholder="Ask about this topic..."
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500/50 transition-colors placeholder:text-muted-foreground/50"
              />
              <button
                onClick={handleTopicChat}
                disabled={chatLoading || !chatInput.trim()}
                className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
      </div>
    </div>
  );
}
