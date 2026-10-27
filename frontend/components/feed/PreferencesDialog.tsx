"use client";

import { useEffect } from "react";
import { Dialog } from "radix-ui";
import { Check, Loader2, X } from "lucide-react";

import { CategoryPicker } from "@/components/feed/CategoryPicker";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { markOnboarded, usePreferencesStore } from "@/lib/store/preferences";
import { useCurrentUserId } from "@/lib/use-current-user";

export function PreferencesDialog() {
  const user = useCurrentUserId();

  const dialogOpen = usePreferencesStore((state) => state.dialogOpen);
  const dialogReason = usePreferencesStore((state) => state.dialogReason);
  const closeDialog = usePreferencesStore((state) => state.closeDialog);
  const available = usePreferencesStore((state) => state.available);
  const availableStatus = usePreferencesStore((state) => state.availableStatus);
  const availableError = usePreferencesStore((state) => state.availableError);
  const loadAvailable = usePreferencesStore((state) => state.loadAvailable);
  const save = usePreferencesStore((state) => state.save);
  const saveStatus = usePreferencesStore((state) => state.saveStatus);
  const saveError = usePreferencesStore((state) => state.saveError);
  const draft = usePreferencesStore((state) => state.draft);
  const setDraft = usePreferencesStore((state) => state.setDraft);
  const toggleDraft = usePreferencesStore((state) => state.toggleDraft);
  const hydrate = usePreferencesStore((state) => state.hydrate);

  // Hydrate once the signed-in user is known, so the shared dialog always has
  // the saved selection ready before it opens.
  useEffect(() => {
    if (!user.ready) return;
    void hydrate(user.authenticated ? user.userId : null);
  }, [hydrate, user.authenticated, user.ready, user.userId]);

  const selectAllAvailable = () => {
    setDraft(
      available
        .filter((category) => category.article_count > 0)
        .map((category) => category.id)
    );
  };

  const handleSave = async () => {
    try {
      await save(draft, user.authenticated ? user.userId : null);
      closeDialog();
    } catch {
      // The store exposes a user-safe error message in the dialog.
    }
  };

  const isEmpty = availableStatus === "ready" && available.length === 0;

  return (
    <Dialog.Root
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open) closeDialog();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-2rem)] max-w-[660px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-popover outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
          aria-describedby="preferences-description"
        >
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="font-heading text-[18px] font-semibold tracking-tight">
                {dialogReason === "onboarding"
                  ? "Choose what you follow"
                  : "Your preferences"}
              </Dialog.Title>
              <Dialog.Description
                id="preferences-description"
                className="mt-1 max-w-md text-[13px] leading-relaxed text-muted-foreground"
              >
                {dialogReason === "onboarding"
                  ? "Pick the desks you want in For You. Your General feed is always unchanged."
                  : "Update the categories that shape For You. The General feed is never filtered."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close preferences"
                className="-mr-1 -mt-1 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Categories
              </p>
              <div className="flex items-center gap-3 text-[12px]">
                <button
                  type="button"
                  onClick={selectAllAvailable}
                  className="cursor-pointer text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Select all available
                </button>
                <span aria-hidden className="h-3 w-px bg-border" />
                <button
                  type="button"
                  onClick={() => setDraft([])}
                  className="cursor-pointer text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            {availableStatus === "loading" ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-[58px] w-full" />
                ))}
              </div>
            ) : availableStatus === "error" ? (
              <ErrorState
                title="Categories could not be loaded"
                message={
                  availableError ||
                  "The news service did not return the category list."
                }
                onRetry={() => void loadAvailable()}
              />
            ) : isEmpty ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No categories are available yet. Try again once stories have
                been ingested.
              </p>
            ) : (
              <CategoryPicker
                categories={available}
                selected={draft}
                onToggle={toggleDraft}
              />
            )}

            <p className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
              {draft.length === 0
                ? "No categories selected — For You will stay empty rather than silently falling back to General."
                : `${draft.length} ${
                    draft.length === 1 ? "category" : "categories"
                  } selected. For You only shows stories filed under them.`}
            </p>

            {saveStatus === "error" && saveError ? (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[12px] text-destructive"
              >
                {saveError}
              </p>
            ) : null}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-3.5">
            {dialogReason === "onboarding" ? (
              <button
                type="button"
                onClick={() => {
                  markOnboarded();
                  closeDialog();
                }}
                className="cursor-pointer text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Skip for now
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Check className="h-3.5 w-3.5" aria-hidden />
                Changes apply to For You only
              </span>
            )}

            <div className="flex items-center gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="lg">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                size="lg"
                onClick={() => void handleSave()}
                disabled={
                  saveStatus === "saving" ||
                  availableStatus === "loading" ||
                  availableStatus === "error"
                }
              >
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Saving
                  </>
                ) : (
                  "Save preferences"
                )}
              </Button>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
