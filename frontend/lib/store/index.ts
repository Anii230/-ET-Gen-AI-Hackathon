import { create } from "zustand";

export type FeedTab = "general" | "foryou";

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
  activeTab: FeedTab;
  setActiveTab: (tab: FeedTab) => void;
}

export const useFeedStore = create<FeedStore>((set) => ({
  activeTab: "general",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
