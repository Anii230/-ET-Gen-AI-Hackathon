import { create } from "zustand";

interface SidebarStore {
  isCollapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isCollapsed: false,
  toggle: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
  setCollapsed: (v) => set({ isCollapsed: v }),
}));

interface FeedStore {
  activeTab: "general" | "for-you";
  setActiveTab: (tab: "general" | "for-you") => void;
}

export const useFeedStore = create<FeedStore>((set) => ({
  activeTab: "general",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
