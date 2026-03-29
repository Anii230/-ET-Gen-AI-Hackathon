const KEY = "et_ai_bookmarks";

export function getBookmarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function toggleBookmark(articleId: string): boolean {
  const current = getBookmarks();
  const isBookmarked = current.includes(articleId);
  if (isBookmarked) {
    localStorage.setItem(KEY, 
      JSON.stringify(current.filter(id => id !== articleId)));
    return false;
  } else {
    localStorage.setItem(KEY, 
      JSON.stringify([...current, articleId]));
    return true;
  }
}

export function isBookmarked(articleId: string): boolean {
  return getBookmarks().includes(articleId);
}
