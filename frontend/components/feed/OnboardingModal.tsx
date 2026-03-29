"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { savePreferences } from "@/lib/api";

const TOPICS = ["Markets", "Economy", "Tech", "Startups", "Policy", "Science", "AI"];
const SOURCES = ["Economic Times", "Mint", "Inc42", "LiveLaw", "NDTV"];

export function OnboardingModal({ onCompleted }: { onCompleted: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [topics, setTopics] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [depth, setDepth] = useState("Both");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onboarded = localStorage.getItem("et_ai_onboarded");
    if (!onboarded) {
      setIsOpen(true);
    }
  }, []);

  const toggleTopic = (t: string) => {
    setTopics((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  const toggleSource = (s: string) => {
    setSources((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await savePreferences("demo_user", topics, sources, depth);
      localStorage.setItem("et_ai_onboarded", "true");
      localStorage.setItem("et_ai_topics", JSON.stringify(topics));
      setIsOpen(false);
      onCompleted();
    } catch (e) {
      console.error("Failed to save preferences", e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6">
          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  step === i ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-700"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">What do you follow?</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Select topics you want to see more of.</p>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map((topic) => {
                    const selected = topics.includes(topic);
                    return (
                      <button
                        key={topic}
                        onClick={() => toggleTopic(topic)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          selected
                            ? "bg-indigo-600 text-white border border-transparent"
                            : "bg-transparent border border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                        }`}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Which sources do you trust?</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Pick publishers you prefer.</p>
                <div className="flex flex-wrap gap-2">
                  {SOURCES.map((source) => {
                    const selected = sources.includes(source);
                    return (
                      <button
                        key={source}
                        onClick={() => toggleSource(source)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          selected
                            ? "bg-indigo-600 text-white border border-transparent"
                            : "bg-transparent border border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                        }`}
                      >
                        {source}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">How deep do you like to read?</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Choose your reading style.</p>
                <div className="space-y-3">
                  {[
                    { id: "Quick headlines", desc: "Just the gist" },
                    { id: "Full analysis", desc: "Deep dives" },
                    { id: "Both", desc: "Mix it up" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setDepth(opt.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-colors ${
                        depth === opt.id
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                          : "border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20"
                      }`}
                    >
                      <div className={`font-semibold ${depth === opt.id ? "text-indigo-700 dark:text-indigo-400" : "text-zinc-900 dark:text-zinc-100"}`}>
                        {opt.id}
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Controls */}
          <div className="mt-8 flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Back
              </button>
            ) : (
              <div /> // Spacer
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Saving..." : "Get Started"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
