"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getFeed, Article } from "@/lib/api";
import { Plus, Check, Brain, ChevronRight, Search, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function NavigatorPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getFeed()
      .then(setArticles)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categorizedArticles = useMemo(() => {
    const groups: Record<string, Article[]> = {};
    articles.forEach(a => {
      const cat = a.category || "General";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(a);
    });
    return groups;
  }, [articles]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSendToChat = () => {
    if (selectedIds.length === 0) return;
    const selectedArticles = articles.filter(a => selectedIds.includes(a.id));
    const carry = {
      mode: "navigate",
      articleIds: selectedIds,
      topicSummary: `Selection of ${selectedIds.length} articles across ${new Set(selectedArticles.map(a => a.category)).size} topics.`
    };
    sessionStorage.setItem("et_navigator_selection", JSON.stringify(carry));
    router.push("/chat?mode=navigate");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh] text-muted-foreground animate-pulse">
      Initialising Intelligence Navigator...
    </div>
  );

  return (
    <div className="p-8 max-w-[1200px] mx-auto min-h-screen pb-32">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-2">
           <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-indigo-500" />
           </div>
           <h1 className="text-3xl font-black tracking-tight text-foreground">News Navigator</h1>
        </div>
        <p className="text-muted-foreground max-w-xl text-lg">
          Select stories across different domains to build your custom intelligence briefing.
        </p>
      </header>

      {/* Topics Grid */}
      <div className="space-y-12">
        {Object.entries((categorizedArticles)).map(([category, items]) => (
          <section key={category} className="space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                <h2 className="text-xl font-bold uppercase tracking-wider text-foreground/90">{category}</h2>
                <span className="text-xs text-muted-foreground font-medium bg-secondary px-2 py-0.5 rounded-full">
                  {items.length} Stories
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((article) => {
                const isSelected = selectedIds.includes(article.id);
                return (
                  <motion.div
                    key={article.id}
                    whileHover={{ y: -4 }}
                    className={`
                      relative p-5 rounded-2xl border transition-all duration-300 group cursor-pointer
                      ${isSelected 
                        ? 'bg-indigo-500/5 border-indigo-500/50 ring-1 ring-indigo-500/20' 
                        : 'bg-card border-border hover:border-indigo-500/30'}
                    `}
                    onClick={() => toggleSelection(article.id)}
                  >
                    <div className="absolute top-4 right-4 z-10">
                       <button
                         className={`
                           w-8 h-8 rounded-full flex items-center justify-center transition-all
                           ${isSelected 
                             ? 'bg-indigo-500 text-white' 
                             : 'bg-secondary text-muted-foreground hover:bg-indigo-500/20 hover:text-indigo-400 border border-border'}
                         `}
                       >
                         {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                       </button>
                    </div>

                    <div className="flex flex-col h-full gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                        {article.source}
                      </span>
                      <h3 className="font-bold text-[15px] leading-snug group-hover:text-indigo-400 transition-colors line-clamp-2">
                        {article.headline}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed opacity-80">
                        {article.summary}
                      </p>
                      
                      <div className="mt-auto pt-2 flex items-center justify-between">
                         <span className="text-[10px] text-muted-foreground/60">{article.read_time} min read</span>
                         <div className={`w-1.5 h-1.5 rounded-full ${
                           article.sentiment_label === 'positive' ? 'bg-emerald-500' :
                           article.sentiment_label === 'negative' ? 'bg-rose-500' : 'bg-indigo-500/40'
                         }`} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Sticky Selection Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-[500px] px-4"
          >
            <div className="bg-background/80 backdrop-blur-xl border border-indigo-500/30 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-6 ring-1 ring-white/10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                     <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{selectedIds.length} Articles Added</p>
                    <p className="text-[11px] text-muted-foreground">Ready for topic-wise synthesis</p>
                  </div>
               </div>
               
               <button 
                 onClick={handleSendToChat}
                 className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 group shadow-lg shadow-indigo-600/20"
               >
                 Synthesize
                 <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
