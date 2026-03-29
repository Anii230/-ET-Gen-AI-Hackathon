import { Zap, Quote } from "lucide-react";
import Link from "next/link";

const miniCards = [
  { category: "AI",      color: "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20",  text: "GPT-5 reshapes AI research benchmarks worldwide" },
  { category: "Economy", color: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20", text: "RBI signals sustained rate pause at 4.1% CPI" },
  { category: "Tech",    color: "bg-blue-500/10 text-blue-300 border border-blue-500/20",         text: "Jio unveils ₹40,000 Cr 6G roadmap" },
];

export function AuthDecorativePanel() {
  return (
    <div className="hidden lg:flex w-[42%] flex-col bg-[#0a0a0a] relative overflow-hidden">
      {/* Radial glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,0.18), transparent 60%)",
        }}
      />
      {/* Grid texture */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 flex flex-col h-full p-10">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 rounded-lg"
        >
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
            <span className="font-heading font-bold text-[10px] text-white leading-none">ET</span>
          </div>
          <span className="font-heading font-bold text-[15px] tracking-tight text-white">
            ET <span className="text-indigo-400">AI</span>
            <span className="text-indigo-400">·</span>
          </span>
        </Link>

        {/* Quote */}
        <div className="mt-auto mb-10">
          <Quote className="w-5 h-5 text-indigo-500/50 mb-4" />
          <p className="text-white/85 text-xl font-heading font-medium italic leading-snug mb-3">
            "Intelligence, delivered personally."
          </p>
          <p className="text-white/35 text-xs font-mono">ET AI · AI-Native News Manifesto</p>
        </div>

        {/* Mini cards */}
        <div className="space-y-2.5">
          {miniCards.map((card, i) => (
            <div
              key={i}
              className="rounded-xl bg-white/[0.05] border border-white/[0.08] p-4 flex items-center gap-3 hover:bg-white/[0.08] transition-all duration-200"
            >
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${card.color}`}>
                {card.category}
              </span>
              <p className="text-white/65 text-[12px] leading-snug flex-1 line-clamp-1">
                {card.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
