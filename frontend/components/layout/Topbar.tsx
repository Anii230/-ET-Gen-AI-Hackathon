"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Search, LogOut, Settings, X } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { savePreferences } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function Topbar() {
  const router = typeof window !== 'undefined' ? require('next/navigation').useRouter() : null;
  const [searchTerm, setSearchTerm] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("User");
  const [notifOpen, setNotifOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  // Initialize supabase lazily inside component or useMemo so environment vars are available in client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const email = data.user.email || "";
        const name = data.user.user_metadata?.full_name 
          || data.user.user_metadata?.name
          || email.split("@")[0]
          || "User";
        setUserEmail(email);
        setUserName(name);
      }
    });
  }, [supabase.auth]);

  useEffect(() => {
    if (prefsOpen) {
      fetch(`${BASE}/users/demo_user/profile`)
        .then(r => r.json())
        .then(data => {
          if (data.topic_preferences?.length > 0) {
            setSelectedTopics(data.topic_preferences);
          }
        });
    }
  }, [prefsOpen]);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm.trim() && router) {
      router.push(`/home/topic/${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm("");
    }
  };

  return (
    <header className="h-[52px] flex items-center gap-4 px-5 border-b border-[var(--border)] bg-[var(--background-secondary)] flex-shrink-0 sticky top-0 z-20">
      {/* Search */}
      <div className="flex-1 max-w-[400px] relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-[var(--foreground-secondary)]" />
        <input
          id="topbar-search"
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearch}
          placeholder="Ask about any topic..."
          suppressHydrationWarning
          className="
            w-full pl-9 pr-4 py-2 rounded-lg
            bg-[var(--background-tertiary)] border border-[var(--border)]
            text-[13px] text-[var(--foreground)]
            placeholder:text-[var(--foreground-secondary)]
            focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40
            transition-all duration-200 ease-out
          "
        />
      </div>

      <div className="flex items-center gap-4 ml-auto">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
            className="p-1.5 rounded-lg hover:bg-[var(--background-tertiary)] transition-colors cursor-pointer relative flex items-center justify-center text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
          </button>

          {notifOpen && (
            <div 
              className="absolute right-0 top-10 w-72 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium">Notifications</p>
              </div>
              <div className="px-4 py-3 space-y-3">
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-foreground">Your personalised feed has been updated</p>
                    <p className="text-xs text-muted-foreground mt-0.5">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-foreground">3 new stories match your interests</p>
                    <p className="text-xs text-muted-foreground mt-0.5">15 minutes ago</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="relative" ref={profileRef}>
          <div
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
            className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium cursor-pointer hover:bg-indigo-500 transition-colors"
          >
            {userName[0].toUpperCase()}
          </div>

          {profileOpen && (
            <div 
              className="absolute right-0 top-10 w-56 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium truncate text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
              <button
                onClick={() => {
                  setProfileOpen(false);
                  setPrefsOpen(true);
                }}
                className="w-full px-4 py-3 text-sm text-left hover:bg-accent transition-colors cursor-pointer flex items-center gap-2 border-b border-border"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                Update preferences
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  localStorage.removeItem("et_ai_onboarded");
                  localStorage.removeItem("et_ai_bookmarks");
                  window.location.href = "/login";
                }}
                className="w-full px-4 py-3 text-sm text-left text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}

          {prefsOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              width: '320px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              zIndex: 100,
              padding: '16px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}>
                <p style={{fontSize: '14px', fontWeight: 500}}>
                  Your preferences
                </p>
                <button 
                  onClick={() => setPrefsOpen(false)}
                  style={{cursor: 'pointer', background: 'none', border: 'none', color: 'var(--muted-foreground)'}}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p style={{fontSize: '12px', color: 'var(--muted-foreground)', marginBottom: '8px'}}>
                Topics
              </p>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '6px', 
                marginBottom: '16px'
              }}>
                {['Markets','Economy','Tech','Startups','Policy','Science','AI','Sports','Entertainment'].map(topic => (
                  <button
                    key={topic}
                    onClick={() => {
                      setSelectedTopics(prev => 
                        prev.includes(topic) 
                          ? prev.filter(t => t !== topic)
                          : [...prev, topic]
                      );
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      border: `1px solid ${
                        selectedTopics.includes(topic) 
                          ? '#6366f1' : 'var(--border)'
                      }`,
                      background: selectedTopics.includes(topic)
                        ? 'rgba(99,102,241,0.15)' : 'transparent',
                      color: selectedTopics.includes(topic)
                        ? '#6366f1' : 'var(--muted-foreground)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {topic}
                  </button>
                ))}
              </div>

              <div style={{display: 'flex', gap: '8px'}}>
                <button
                  onClick={async () => {
                    await savePreferences(
                      "demo_user", selectedTopics, [], "both"
                    );
                    setPrefsOpen(false);
                    window.location.href = '/home?tab=foryou';
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Save &amp; reload feed
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
