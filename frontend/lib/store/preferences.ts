"use client";

import { create } from "zustand";

import {
  type CategoryInfo,
  getCategories,
  getProfile,
  savePreferences,
} from "@/lib/api";

const CATEGORIES_KEY = "et_ai_categories";
const LEGACY_TOPICS_KEY = "et_ai_topics";
const ONBOARDED_KEY = "et_ai_onboarded";

/** Canonical order shared with the backend taxonomy. */
const CATEGORY_ORDER = [
  "business-economy",
  "markets-investing",
  "technology",
  "artificial-intelligence",
  "startups-vc",
  "science-research",
  "cybersecurity",
  "politics-government",
  "world-news",
  "india-news",
  "climate-environment",
  "energy",
  "healthcare",
  "education",
  "sports",
  "entertainment-culture",
  "gaming",
  "automotive-mobility",
] as const;

const LEGACY_ALIASES: Record<string, string> = {
  markets: "markets-investing",
  market: "markets-investing",
  economy: "business-economy",
  business: "business-economy",
  tech: "technology",
  technology: "technology",
  startups: "startups-vc",
  startup: "startups-vc",
  policy: "politics-government",
  politics: "politics-government",
  science: "science-research",
  ai: "artificial-intelligence",
  "artificial intelligence": "artificial-intelligence",
  world: "world-news",
  india: "india-news",
  climate: "climate-environment",
  energy: "energy",
  health: "healthcare",
  healthcare: "healthcare",
  education: "education",
  sports: "sports",
  entertainment: "entertainment-culture",
  gaming: "gaming",
  auto: "automotive-mobility",
  "business & economy": "business-economy",
  "markets & investing": "markets-investing",
  "startups & venture capital": "startups-vc",
  "science & research": "science-research",
  "politics & government": "politics-government",
  "world news": "world-news",
  "india news": "india-news",
  "climate & environment": "climate-environment",
  "entertainment & culture": "entertainment-culture",
  "automotive & mobility": "automotive-mobility",
  cybersecurity: "cybersecurity",
};

const ORDER_INDEX = new Map<string, number>(
  CATEGORY_ORDER.map((id, index) => [id, index])
);

export function normalizeCategoryIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const resolved = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const raw = value.trim();
    if (!raw) continue;
    const canonical = LEGACY_ALIASES[raw.toLowerCase()] ?? raw;
    if (ORDER_INDEX.has(canonical)) resolved.add(canonical);
  }
  return [...resolved].sort(
    (a, b) => (ORDER_INDEX.get(a) ?? 99) - (ORDER_INDEX.get(b) ?? 99)
  );
}

function readStoredCategories(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CATEGORIES_KEY);
    if (raw) return normalizeCategoryIds(JSON.parse(raw));
  } catch {
    // Corrupt storage: fall through to the legacy key.
  }
  try {
    const legacy = window.localStorage.getItem(LEGACY_TOPICS_KEY);
    if (legacy) return normalizeCategoryIds(JSON.parse(legacy));
  } catch {
    // Ignore unreadable legacy values.
  }
  return [];
}

function writeStoredCategories(categories: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  } catch {
    // Storage can be unavailable in private mode; the in-memory store still
    // reflects the selection for this session.
  }
}

export function markOnboarded(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDED_KEY, "true");
  } catch {
    // Ignore.
  }
}

export function hasOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(ONBOARDED_KEY) === "true";
  } catch {
    return true;
  }
}

export type PreferencesStatus = "idle" | "loading" | "ready" | "error";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface PreferencesStore {
  categories: string[];
  hydration: PreferencesStatus;
  hydratedFor: string | null;
  available: CategoryInfo[];
  availableStatus: PreferencesStatus;
  availableError: string | null;
  dialogOpen: boolean;
  dialogReason: "onboarding" | "edit";
  draft: string[];
  draftTouched: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  lastSavedAt: number | null;
  lastSavedReason: "onboarding" | "edit" | null;
  hydrate: (userId: string | null) => Promise<void>;
  loadAvailable: () => Promise<void>;
  openDialog: (reason?: "onboarding" | "edit") => void;
  closeDialog: () => void;
  setDraft: (draft: string[]) => void;
  toggleDraft: (id: string) => void;
  save: (categories: string[], userId: string | null) => Promise<void>;
  reset: () => void;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export const usePreferencesStore = create<PreferencesStore>((set, get) => ({
  categories: [],
  hydration: "idle",
  hydratedFor: null,
  available: [],
  availableStatus: "idle",
  availableError: null,
  dialogOpen: false,
  dialogReason: "edit",
  draft: [],
  draftTouched: false,
  saveStatus: "idle",
  saveError: null,
  lastSavedAt: null,
  lastSavedReason: null,

  hydrate: async (userId) => {
    const key = userId ?? "guest";
    if (get().hydration === "loading") return;
    if (get().hydration === "ready" && get().hydratedFor === key) return;

    set({ hydration: "loading", hydratedFor: key });

    let categories = readStoredCategories();

    // Authenticated preferences are the source of truth. Guests never read
    // the shared demo profile; their explicit local selection is sent as a
    // category filter instead.
    if (userId) {
      try {
        const profile = await getProfile(userId);
        const saved = normalizeCategoryIds(profile.categories);
        if (saved.length > 0) categories = saved;
      } catch {
        // Keep the local cache usable while the backend is unreachable.
      }
    }

    writeStoredCategories(categories);
    const { dialogOpen, draftTouched } = get();
    set({
      categories,
      hydration: "ready",
      hydratedFor: key,
      ...(dialogOpen && !draftTouched ? { draft: categories } : {}),
    });
  },

  loadAvailable: async () => {
    if (get().availableStatus === "loading") return;
    if (get().availableStatus === "ready") return;

    set({ availableStatus: "loading", availableError: null });
    try {
      const categories = await getCategories();
      set({ available: categories, availableStatus: "ready" });
    } catch (error) {
      set({
        availableStatus: "error",
        availableError: errorMessage(
          error,
          "Categories could not be loaded. Please try again."
        ),
      });
    }
  },

  openDialog: (reason = "edit") => {
    set({
      dialogOpen: true,
      dialogReason: reason,
      draft: get().categories,
      draftTouched: false,
      saveStatus: "idle",
      saveError: null,
    });
    void get().loadAvailable();
  },

  closeDialog: () => {
    set({ dialogOpen: false, saveStatus: "idle", saveError: null });
  },

  setDraft: (draft) => {
    set({ draft, draftTouched: true });
  },

  toggleDraft: (id) => {
    const current = get().draft;
    const next = current.includes(id)
      ? current.filter((category) => category !== id)
      : [...current, id];
    set({ draft: next, draftTouched: true });
  },

  save: async (draft, userId) => {
    const categories = normalizeCategoryIds(draft);
    set({ saveStatus: "saving", saveError: null });

    try {
      let saved = categories;
      if (userId) {
        const response = await savePreferences(userId, categories);
        saved = normalizeCategoryIds(response.categories);
      }
      writeStoredCategories(saved);
      markOnboarded();
      set({
        categories: saved,
        saveStatus: "saved",
        saveError: null,
        lastSavedAt: Date.now(),
        lastSavedReason: get().dialogReason,
      });
    } catch (error) {
      set({
        saveStatus: "error",
        saveError: errorMessage(
          error,
          "Your preferences could not be saved. Please try again."
        ),
      });
      throw error;
    }
  },

  reset: () =>
    set({
      categories: [],
      hydration: "idle",
      hydratedFor: null,
      available: [],
      availableStatus: "idle",
      availableError: null,
      dialogOpen: false,
      dialogReason: "edit",
      draft: [],
      draftTouched: false,
      saveStatus: "idle",
      saveError: null,
      lastSavedAt: null,
      lastSavedReason: null,
    }),
}));
