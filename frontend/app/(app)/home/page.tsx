"use client";
import { useEffect, useState } from "react";
import { BentoMonochrome, BentoArticle } from "@/components/ui/bento-monochrome";
import { FeedToggle } from "@/components/feed/FeedToggle";
import { getFeed, getPersonalisedFeed, Article } from "@/lib/api";
import { OnboardingModal } from "@/components/feed/OnboardingModal";
import { useRouter } from "next/navigation";
import { SmallArticleCard } from "@/components/feed/SmallArticleCard";

const mapArticleToBento = (article: Article): BentoArticle => {
  const categoryColors: Record<string, string> = {
    "AI": "indigo",
    "Tech": "blue",
    "Economy": "green",
    "Markets": "green",
    "Startups": "purple",
    "Policy": "amber",
  };
  
  // Format the time vaguely for display if needed
  let timeStr = "Recent";
  if (article.published_at) {
    const d = new Date(article.published_at);
    timeStr = d.toLocaleDateString();
  }

  return {
    id: article.id,
    category: article.category || "General",
    categoryColor: categoryColors[article.category] || "indigo",
    headline: article.headline,
    summary: article.summary || "",
    source: article.source,
    time: timeStr,
    readTime: `${article.read_time}m`,
    isPersonalised: article.is_personalised,
    image_url: article.image_url,
  };
};

export default function AppHomePage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"general" | "foryou">("general");
  const [userTopics, setUserTopics] = useState<string[]>([]);

  const loadTopics = () => {
    const saved = localStorage.getItem("et_ai_topics");
    if (saved) {
      try {
        setUserTopics(JSON.parse(saved));
      } catch(e) {}
    }
  };

  useEffect(() => {
    loadTopics();
  }, []);

  useEffect(() => {
    async function loadFeed() {
      setLoading(true);
      try {
        const data = activeTab === "general"
          ? await getFeed()
          : await getPersonalisedFeed("demo_user");
        setArticles(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, [activeTab]);

  const displayArticles = articles.filter(article => {
    if (activeTab === "general" || userTopics.length === 0) return true;
    // Simple category matching
    return userTopics.includes(article.category);
  });

  const bentoArticles = displayArticles.map(mapArticleToBento);

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <OnboardingModal onCompleted={() => { 
        loadTopics();
        if(activeTab !== "foryou") setActiveTab("foryou"); 
      }} />
      {/* Feed header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
            Today&apos;s Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <FeedToggle activeTab={activeTab} onChange={(t: "general" | "foryou") => setActiveTab(t)} />
      </div>

      {/* Bento grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground text-sm">
            Loading feed...
          </div>
        </div>
      ) : displayArticles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-2xl bg-muted/5 p-8 text-center">
          <p className="text-foreground font-medium mb-1">Nothing matched your interests yet</p>
          <p className="text-muted-foreground text-sm max-w-xs">
            We haven't found any news in {userTopics.join(", ")} recently.
          </p>
          <button 
            onClick={() => setActiveTab("general")}
            className="mt-6 px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Check General Feed
          </button>
        </div>
      ) : (
        <BentoMonochrome articles={bentoArticles} onArticleClick={(id) => router.push(`/home/article/${id}`)} />
      )}
    </div>
  );
}
