"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getStoryArcs, getBriefing, StoryArc } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Target, Shield, Zap, ChevronRight, TrendingUp } from "lucide-react";

const sentimentColor = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#6366f1',
};

const trendLabel = {
  improving: '↑ Improving',
  declining: '↓ Declining', 
  stable: '→ Stable',
};

// ── Markdown Parser ───────────────────────────────────────
const MarkdownText = ({ content, className = "" }: { content: string, className?: string }) => {
  if (!content) return null;
  // Splits by **text** and renders as strong
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return <strong key={i} className="font-black text-foreground">{p.slice(2, -2)}</strong>;
        }
        return p;
      })}
    </span>
  );
};

// ── Components ───────────────────────────────────────

const ArcSentimentChart = ({ 
  timeline, 
  onPointClick, 
  selectedIndices 
}: { 
  timeline: StoryArc['timeline'], 
  onPointClick: (index: number) => void,
  selectedIndices: number[]
}) => {
  const points = timeline.map((event, i) => {
    const x = (i / (timeline.length - 1 || 1)) * 100;
    const y = event.sentiment === 'positive' ? 20 : event.sentiment === 'negative' ? 80 : 50;
    return { x, y };
  });

  const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="h-[280px] w-full bg-muted/20 rounded-2xl border border-border/50 p-8 relative overflow-visible group backdrop-blur-sm">
      <div className="absolute top-4 left-6 text-[10px] uppercase tracking-widest text-indigo-500 font-black flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
        Comparative Analysis Flow
      </div>
      <div className="absolute top-4 right-6 text-[10px] text-muted-foreground/60 font-medium">
        Select nodes for narrative synthesis
      </div>
      
      {/* Background Grid Lines */}
      <div className="absolute inset-0 z-0 flex flex-col justify-between py-12 px-8 opacity-20 pointer-events-none">
        <div className="w-full h-px bg-indigo-500/20" />
        <div className="w-full h-px bg-indigo-500/20" />
        <div className="w-full h-px bg-indigo-500/20" />
      </div>

      <div className="w-full h-full relative z-10 px-2">
        {/* SVG Path Layer Only (No Nodes) */}
        <svg 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none" 
          className="w-full h-full overflow-visible"
        >
          <motion.polyline
            fill="none"
            stroke="url(#sentimentGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsString}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
          <defs>
            <linearGradient id="sentimentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>

        {/* HTML Node Overlay (Guarantees Perfectly Circular Nodes) */}
        <div className="absolute inset-0 pointer-events-none px-2">
          {points.map((p, i) => {
            const isSelected = selectedIndices.includes(i);
            return (
              <div 
                key={i}
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute pointer-events-auto cursor-pointer"
                onClick={() => onPointClick(i)}
              >
                {/* Hit Area Glower */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 2.2, opacity: 0.2 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className="absolute inset-0 rounded-full bg-indigo-500 blur-sm"
                    />
                  )}
                </AnimatePresence>
                
                {/* Larger, High-Contrast Node */}
                <motion.div
                  initial={false}
                  animate={{
                    width: isSelected ? 16 : 12,
                    height: isSelected ? 16 : 12,
                    backgroundColor: isSelected ? '#ffffff' : 'var(--background)',
                    borderColor: isSelected ? '#818cf8' : '#818cf8',
                    borderWidth: 2.5,
                  }}
                  whileHover={{ scale: 1.2, backgroundColor: '#818cf8', borderColor: '#fff' }}
                  className="rounded-full shadow-lg transition-all ring-4 ring-indigo-500/5"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute left-2 top-[20%] text-[8px] text-emerald-400/50 font-bold uppercase rotate-270">POS</div>
      <div className="absolute left-2 top-[50%] text-[8px] text-indigo-400/50 font-bold uppercase rotate-270">NEU</div>
      <div className="absolute left-2 top-[80%] text-[8px] text-rose-400/50 font-bold uppercase rotate-270">NEG</div>
    </div>
  );
};

const ArcNarrativeTimeline = ({ timeline }: { timeline: StoryArc['timeline'] }) => {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      // Check if the scroll is horizontal/vertical and stop propagation to prevent parent scrolling
      e.preventDefault();
      e.stopPropagation();
      scrollRef.current.scrollBy({
        left: e.deltaY * 1.5,
        behavior: 'auto' // 'smooth' can sometimes feel laggy in tight boxes, 'auto' is more responsive if implemented properly
      });
    }
  };
  
  return (
    <div 
      ref={scrollRef}
      onWheel={handleWheel}
      style={{
        paddingTop: '160px',
        paddingBottom: '160px',
      }}
      className="relative w-full overflow-x-auto custom-scrollbar -mx-4 px-4 mt-2 no-scrollbar cursor-grab active:cursor-grabbing"
    >
      <div 
        className="relative h-full flex items-center justify-center" 
        style={{ 
          width: 'max-content',
          minWidth: '100%',
          paddingLeft: '120px',
          paddingRight: '120px'
        }}
      >
        {/* Axis Line */}
        <div className="absolute inset-x-0 top-1/2 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent -translate-y-1/2 z-0 opacity-40" />
        
        {/* Timeline Events */}
        <div className="flex items-center gap-[150px] relative z-10 py-12">
          {timeline.map((event, i) => {
            const isUpper = i % 2 === 0;
            const color = sentimentColor[event.sentiment as keyof typeof sentimentColor] || '#6366f1';
            
            return (
              <div 
                key={i} 
                className="relative flex flex-col items-center flex-shrink-0" 
              >
                {/* Connector Line */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 60 }}
                  transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                  className={`absolute w-px border-l border-dashed border-indigo-500/30 ${isUpper ? 'bottom-full mb-3 origin-bottom' : 'top-full mt-3 origin-top'}`}
                >
                    <div className={`absolute ${isUpper ? 'top-0' : 'bottom-0'} left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500/30 border border-indigo-500/40`} />
                </motion.div>

                {/* Content Card Area */}
                <motion.div
                  initial={{ opacity: 0, y: isUpper ? -20 : 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 + 0.4 }}
                  whileHover={{ 
                    y: isUpper ? -5 : 5, 
                    scale: 1.02,
                    transition: { duration: 0.3, ease: "easeOut" }
                  }}
                  className={`absolute w-56 cursor-pointer group z-30 ${isUpper ? 'bottom-[80px]' : 'top-[80px]'}`}
                  onClick={() => router.push(`/home/article/${event.article_id}`)}
                >
                  <div className="relative p-4 rounded-[20px] bg-card/70 border border-white/10 hover:border-indigo-500/50 hover:bg-card transition-all shadow-xl backdrop-blur-xl group-hover:shadow-indigo-500/10">
                     {/* Sentiment Accent */}
                    <div 
                      className="absolute top-0 left-6 w-10 h-1 rounded-b-xl" 
                      style={{ 
                        backgroundColor: color,
                        boxShadow: `0 2px 10px ${color}40`
                      }}
                    />
                    
                    <div className="flex items-center justify-between mb-4">
                       <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/50">{event.date}</span>
                       <div 
                        className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 uppercase text-muted-foreground/80 tracking-normal"
                       >
                        {event.source}
                       </div>
                    </div>
                    
                    <h4 className="text-[13px] font-bold leading-tight text-foreground group-hover:text-indigo-400 transition-colors line-clamp-2 tracking-tight">
                       {event.headline}
                    </h4>

                    <div className="mt-3 flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-all duration-300">
                      <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/40 to-transparent" />
                      <ChevronRight className="w-3 h-3 text-indigo-500 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.div>

                {/* Node on Axis */}
                <div className="relative z-20 flex items-center justify-center">
                    {/* Radar Pulse Node */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 10, stiffness: 200, delay: i * 0.1 }}
                        className="relative w-10 h-10 flex items-center justify-center cursor-help"
                    >
                        {/* Radar Rings */}
                        <div 
                            className="absolute inset-0 rounded-full border border-current opacity-20 animate-[ping_3s_infinite]" 
                            style={{ color }}
                        />
                         <div 
                            className="absolute inset-2 rounded-full border-2 border-current opacity-40 animate-[ping_2s_infinite]" 
                            style={{ color }}
                        />
                        
                        {/* Core Node */}
                        <div 
                            className="w-4 h-4 rounded-full border-2 border-card shadow-2xl relative z-30"
                            style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}80` }}
                        />
                        
                        {/* Sentiment Glow */}
                        <div 
                            className="absolute inset-0 rounded-full blur-[12px] opacity-30 pointer-events-none" 
                            style={{ backgroundColor: color }}
                        />
                    </motion.div>
                    
                    {/* Tick Label Overlay */}
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <span className="text-[10px] font-black text-foreground tracking-[0.2em] bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            T+{i + 1}
                        </span>
                        <div className="h-3 w-px bg-white/10 mt-1" />
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ArcPlayersBubble = ({ players }: { players: StoryArc['key_players'] }) => {
  return (
    <div className="flex flex-col gap-3 mt-1 w-full">
      {players.slice(0, 4).map((player, i) => (
        <motion.div
          key={player.name}
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-500 group-hover:scale-110 transition-transform">
            {player.name[0]}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
             <span className="text-[13px] font-bold text-foreground truncate">{player.name}</span>
             <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                   {[...Array(3)].map((_, j) => (
                     <div key={j} className="w-1.5 h-1.5 rounded-full bg-indigo-500/30 border border-background" />
                   ))}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{player.mention_count} Mentions</span>
             </div>
          </div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
          />
        </motion.div>
      ))}
    </div>
  );
};

export default function TrendingPage() {
  const [arcs, setArcs] = useState<StoryArc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeArc, setActiveArc] = useState<string | null>(null);
  const [selectedEventIndices, setSelectedEventIndices] = useState<number[]>([]);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setSelectedEventIndices([]);
    setSummaryResult("");
  }, [activeArc]);

  const toggleEvent = (index: number) => {
    setSelectedEventIndices(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index].sort((a, b) => a - b)
    );
  };

  const generateAILensSummary = async () => {
    if (selectedEventIndices.length === 0 || !activeArc) return;
    const selected = arcs.find(a => a.id === activeArc);
    if (!selected) return;

    setSummarizing(true);
    setSummaryResult("");
    
    try {
      const articleIds = selectedEventIndices.map(i => selected.timeline[i].article_id);
      const res = await getBriefing(
        "demo_user", 
        "Summarize these articles into a very concise briefing of 2 sentences max. Focus on narrative connections. No bold headers.", 
        articleIds
      );
      setSummaryResult(res.briefing);
    } catch (error) {
      console.error("Synthesis failed:", error);
      setSummaryResult("Intelligence Analysis: Sorry, I couldn't synthesize these specific events. Please try again.");
    } finally {
      setSummarizing(false);
    }
  };

  useEffect(() => {
    getStoryArcs()
      .then(data => {
        setArcs(data);
        if (data.length > 0) setActiveArc(data[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      color: 'var(--muted-foreground)',
      fontSize: '14px',
    }}>
      Building story arcs...
    </div>
  );

  const selected = arcs.find(a => a.id === activeArc);

  return (
    <div style={{
      padding: '32px',
      maxWidth: '100%',
      overflowX: 'hidden',
      position: 'relative'
    }}>
      <div style={{marginBottom: '32px'}}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 800,
          color: 'var(--foreground)',
          marginBottom: '6px',
          letterSpacing: '-0.02em',
        }}>
          Story Arcs
        </h1>
        <p style={{
          fontSize: '15px',
          color: 'var(--muted-foreground)',
          opacity: 0.8
        }}>
          AI-tracked narratives across ongoing news stories
        </p>
      </div>

      {arcs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          color: 'var(--muted-foreground)',
        }}>
          No story arcs yet. Check back after more articles 
          are fetched.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '260px minmax(0, 1fr)',
          gap: '24px',
          alignItems: 'start',
          width: '100%'
        }}>
          
          {/* Arc list */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            {arcs.map(arc => (
              <button
                key={arc.id}
                onClick={() => setActiveArc(arc.id)}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${
                    activeArc === arc.id 
                      ? sentimentColor[
                          arc.overall_sentiment as keyof 
                          typeof sentimentColor
                        ] || '#6366f1'
                      : 'var(--border)'
                  }`,
                  background: activeArc === arc.id
                    ? `${sentimentColor[
                        arc.overall_sentiment as keyof 
                        typeof sentimentColor
                      ] || '#6366f1'}10`
                    : 'var(--card)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '6px',
                }}>
                  <span style={{
                    fontSize: '14.5px',
                    fontWeight: 600,
                    color: 'var(--foreground)',
                    lineHeight: '1.3',
                  }}>
                    {arc.title}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: `${
                      sentimentColor[
                        arc.overall_sentiment as keyof 
                        typeof sentimentColor
                      ] || '#6366f1'
                    }20`,
                    color: sentimentColor[
                      arc.overall_sentiment as keyof 
                      typeof sentimentColor
                    ] || '#6366f1',
                    flexShrink: 0,
                    marginLeft: '8px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}>
                    {arc.overall_sentiment}
                  </span>
                </div>
                <span style={{
                  fontSize: '13px',
                  color: 'var(--muted-foreground)',
                  marginTop: '4px',
                  display: 'block'
                }}>
                  {arc.article_count} articles · {
                    trendLabel[
                      arc.sentiment_trend as keyof 
                      typeof trendLabel
                    ] || arc.sentiment_trend
                  }
                </span>
              </button>
            ))}
          </div>

          {/* Arc detail */}
          {selected && (
            <div 
              key={selected.id}
              className="border border-border rounded-[32px] p-8 bg-card shadow-sm min-w-0"
            >
              {/* Header */}
              <div className="mb-10">
                <div className="flex items-center gap-4 mb-5">
                  <h2 className="text-[32px] font-black text-foreground tracking-tight">
                    {selected.title}
                  </h2>
                  <span className={`text-[12px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest border transition-colors ${
                      selected.overall_sentiment === 'positive' 
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                        : selected.overall_sentiment === 'negative' 
                          ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' 
                          : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                  }`}>
                    {selected.overall_sentiment} · {
                      trendLabel[
                        selected.sentiment_trend as keyof 
                        typeof trendLabel
                      ] || selected.sentiment_trend
                    }
                  </span>
                </div>
                <p className="text-[16px] text-muted-foreground leading-relaxed max-w-3xl font-medium opacity-80">
                  {selected.description}
                </p>
              </div>

              {/* Interactive Sentiment Chart & Influence Cards */}
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 mb-10 items-stretch">
                <ArcSentimentChart 
                  key={selected.id}
                  timeline={selected.timeline} 
                  onPointClick={toggleEvent}
                  selectedIndices={selectedEventIndices}
                />
                 <div className="bg-muted/30 rounded-3xl border border-border/50 p-6 flex flex-col items-start overflow-hidden relative backdrop-blur-sm">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-indigo-600 font-black mb-6 self-start flex items-center gap-2">
                      <Target className="w-3.5 h-3.5" />
                      Network Influence
                    </div>
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/[0.03] blur-3xl -mr-16 -mt-16 rounded-full" />
                   <div className="flex-1 w-full overflow-y-auto pr-1 flex flex-col gap-1 custom-scrollbar min-h-[140px]">
                     <ArcPlayersBubble key={selected.id} players={selected.key_players} />
                   </div>
                   
                   {selectedEventIndices.length > 1 && (
                     <motion.button
                       initial={{ y: 20, opacity: 0 }}
                       animate={{ y: 0, opacity: 1 }}
                       onClick={generateAILensSummary}
                       className="mt-6 w-full py-3.5 px-5 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-[12px] font-black text-white shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 z-20 uppercase tracking-[0.2em]"
                     >
                       <Brain className="w-4 h-4" />
                       Synthesize {selectedEventIndices.length} Events
                     </motion.button>
                   )}
                </div>
              </div>

              {/* Comparative Preview Area */}
              <AnimatePresence>
                {(selectedEventIndices.length > 0 || summaryResult || summarizing) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-10 space-y-5"
                  >
                    {/* Multi-Select Header */}
                    <div className="flex items-center justify-between px-2">
                       <div className="flex items-center gap-4">
                          <h3 className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.3em]">Active Analysis Panel</h3>
                          <div className="h-4 w-px bg-border" />
                          <span className="text-[13px] font-bold text-muted-foreground">{selectedEventIndices.length} articles indexed</span>
                       </div>
                       <button 
                         onClick={() => { setSelectedEventIndices([]); setSummaryResult(""); }} 
                         className="text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-rose-600 transition-colors bg-muted/50 px-3 py-1.5 rounded-lg border border-border"
                       >
                        Clear Selection
                       </button>
                    </div>

                    {/* AI Summary Reveal */}
                    {(summarizing || summaryResult) && (
                      <div className="p-8 rounded-[32px] bg-indigo-600/[0.03] border border-indigo-500/10 relative overflow-hidden shadow-inner">
                        <div className="absolute top-0 left-0 w-1.5 bg-indigo-600 h-full" />
                        <div className="flex items-center gap-3 mb-5">
                           <div className="w-8 h-8 rounded-full bg-indigo-600/10 flex items-center justify-center">
                              <Brain className={`w-4 h-4 text-indigo-600 ${summarizing ? 'animate-pulse' : ''}`} />
                           </div>
                           <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em]">AI Narrative Lens Synthesis</span>
                        </div>
                        {summarizing ? (
                          <div className="space-y-3">
                            <div className="h-4 w-full bg-muted animate-pulse rounded-full" />
                            <div className="h-4 w-2/3 bg-muted animate-pulse rounded-full" />
                          </div>
                        ) : (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[17px] leading-relaxed text-foreground/90 font-medium italic"
                          >
                            <MarkdownText content={summaryResult} />
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* Comparative Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {selectedEventIndices.map((index) => {
                        const event = selected.timeline[index];
                        const color = sentimentColor[event.sentiment as keyof typeof sentimentColor] || '#6366f1';
                        return (
                          <motion.div
                            key={index}
                            layout
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="p-6 rounded-3xl bg-muted/20 border border-border/60 hover:border-indigo-500/30 transition-all flex flex-col gap-4 group relative hover:shadow-lg hover:shadow-black/[0.02]"
                          >
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                  <div 
                                    className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]" 
                                    style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}30` }} 
                                  />
                                  <span className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em]">{event.date}</span>
                               </div>
                               <button 
                                  onClick={() => toggleEvent(index)}
                                  className="p-1 px-2 rounded-lg bg-muted border border-border opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-tighter"
                                >
                                 Deselect
                               </button>
                            </div>
                            <h4 
                              className="font-bold text-[16px] text-foreground hover:text-indigo-600 cursor-pointer transition-colors line-clamp-2 leading-snug" 
                              onClick={() => router.push(`/home/article/${event.article_id}`)}
                            >
                              {event.headline}
                            </h4>
                            <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                              <span className="truncate max-w-[140px]">{event.source}</span>
                              <span className="text-[9px] px-2 py-0.5 rounded bg-muted border border-border">{event.sentiment}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Narrative Progression (Horizontal Timeline) */}
              <div className="mt-14 overflow-visible">
                <div className="flex items-center gap-4 mb-10 px-2 group">
                   <div className="w-12 h-px bg-indigo-500/20 group-hover:w-20 transition-all duration-500" />
                   <p className="text-[11px] uppercase font-black tracking-[0.4em] text-indigo-600/60">
                     Strategic Timeline
                   </p>
                   <div className="flex-1 h-px bg-border/40" />
                </div>
                <div className="bg-muted/20 rounded-[40px] border border-border/40 p-2 overflow-hidden relative">
                   <div className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-background to-transparent z-40 pointer-events-none rounded-l-[40px]" />
                   <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-background to-transparent z-40 pointer-events-none rounded-r-[40px]" />
                   <ArcNarrativeTimeline timeline={selected.timeline} />
                </div>
              </div>

              {/* Footer Insight */}
              <div className="mt-16">
                 <div className="p-10 rounded-[40px] bg-indigo-600/[0.03] border border-indigo-500/15 relative overflow-hidden group/footer">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/[0.04] blur-[120px] -mr-48 -mt-48 rounded-full transition-all duration-700 group-hover/footer:scale-110" />
                    <div className="max-w-4xl relative z-10 leading-[1.7] text-[18px] font-medium italic text-foreground tracking-tight opacity-90">
                       <MarkdownText content={selected.what_to_watch} />
                    </div>
                    <div className="mt-8 flex items-center gap-4">
                       <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 flex items-center justify-center group-hover/footer:rotate-12 transition-transform">
                          <Target className="w-5 h-5 text-indigo-600" />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[12px] font-black uppercase tracking-[0.3em] text-indigo-600">Strategic Outlook</span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Narrative Intelligence Engine</span>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
