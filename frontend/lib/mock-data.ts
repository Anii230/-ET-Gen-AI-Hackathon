export interface Article {
  id: string;
  title: string;
  summary: string;
  category: string;
  categoryColor: string;
  source: string;
  timestamp: string;
  readTime: number;
  isPersonalized?: boolean;
}

export const mockArticles: Article[] = [
  {
    id: "1",
    title: "OpenAI GPT-5 Redefines Reasoning Benchmarks",
    summary:
      "The latest model from OpenAI achieves near-human performance on complex reasoning tasks, prompting AI labs worldwide to reconsider evaluation methodologies and publication timelines.",
    category: "AI",
    categoryColor: "indigo",
    source: "The Verge",
    timestamp: "2 hours ago",
    readTime: 6,
    isPersonalized: true,
  },
  {
    id: "2",
    title: "RBI Signals Rate Pause at 4.1% Inflation",
    summary:
      "The Reserve Bank of India's Monetary Policy Committee signaled a prolonged pause on rates as food inflation eases, boosting market sentiment heading into Q2.",
    category: "Economy",
    categoryColor: "emerald",
    source: "Economic Times",
    timestamp: "4 hours ago",
    readTime: 4,
  },
  {
    id: "3",
    title: "Reliance Jio 6G Roadmap: $10B Investment",
    summary:
      "Reliance Industries unveils ambitious 6G deployment plans as part of its Digital India push, partnering with Nokia and Samsung for infrastructure buildout.",
    category: "Tech",
    categoryColor: "blue",
    source: "Mint",
    timestamp: "6 hours ago",
    readTime: 5,
  },
  {
    id: "4",
    title: "India AI Startups See Record ₹40,000 Cr VC",
    summary:
      "Indian AI startups attracted unprecedented venture capital as global funds compete for positions in a market projected to reach $150B by 2030.",
    category: "Startups",
    categoryColor: "orange",
    source: "Inc42",
    timestamp: "8 hours ago",
    readTime: 3,
    isPersonalized: true,
  },
  {
    id: "5",
    title: "Supreme Court Upholds Algorithmic Transparency Law",
    summary:
      "In a landmark ruling, the Supreme Court mandated that platforms with over 50M users must disclose key algorithmic weights used in content ranking decisions.",
    category: "Policy",
    categoryColor: "rose",
    source: "LiveLaw",
    timestamp: "12 hours ago",
    readTime: 7,
  },
  {
    id: "6",
    title: "ISRO Gaganyaan Sets August Launch Window",
    summary:
      "India's first crewed spaceflight program confirms its launch window following successful unmanned test flights, with three astronauts selected for the historic mission.",
    category: "Science",
    categoryColor: "cyan",
    source: "NDTV",
    timestamp: "1 day ago",
    readTime: 4,
  },
];

export const categoryColorMap: Record<string, string> = {
  indigo:  "bg-indigo-500/15 text-indigo-400 dark:text-indigo-300",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  blue:    "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  orange:  "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  rose:    "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  cyan:    "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
};

export const categoryStyles: Record<string, { pill: string; bar: string }> = {
  indigo:  { pill: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",   bar: "bg-indigo-500" },
  emerald: { pill: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", bar: "bg-emerald-500" },
  blue:    { pill: "bg-blue-500/10 text-blue-400 border border-blue-500/20",          bar: "bg-blue-500" },
  orange:  { pill: "bg-amber-500/10 text-amber-400 border border-amber-500/20",       bar: "bg-amber-500" },
  amber:   { pill: "bg-amber-500/10 text-amber-400 border border-amber-500/20",       bar: "bg-amber-500" },
  rose:    { pill: "bg-rose-500/10 text-rose-400 border border-rose-500/20",          bar: "bg-rose-500" },
  cyan:    { pill: "bg-teal-500/10 text-teal-400 border border-teal-500/20",          bar: "bg-teal-500" },
  teal:    { pill: "bg-teal-500/10 text-teal-400 border border-teal-500/20",          bar: "bg-teal-500" },
  purple:  { pill: "bg-purple-500/10 text-purple-400 border border-purple-500/20",    bar: "bg-purple-500" },
  green:   { pill: "bg-green-500/10 text-green-400 border border-green-500/20",       bar: "bg-green-500" },
  gray:    { pill: "bg-gray-500/10 text-gray-400 border border-gray-500/20",          bar: "bg-gray-500" },
};
