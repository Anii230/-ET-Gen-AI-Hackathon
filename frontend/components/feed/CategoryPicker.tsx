"use client";

import { Check } from "lucide-react";
import { Checkbox } from "radix-ui";

import type { CategoryInfo } from "@/lib/api";
import { cn } from "@/lib/utils";

export function CategoryPicker({
  categories,
  selected,
  onToggle,
}: {
  categories: CategoryInfo[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label="News categories"
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
    >
      {categories.map((category) => {
        const isSelected = selected.includes(category.id);
        const isEmpty = category.article_count === 0;
        const disabled = isEmpty && !isSelected;
        const countLabel = isEmpty
          ? "No stories yet"
          : `${category.article_count} ${
              category.article_count === 1 ? "story" : "stories"
            }`;

        return (
          <label
            key={category.id}
            htmlFor={`category-${category.id}`}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
              isSelected
                ? "border-accent/40 bg-accent-soft"
                : "border-border bg-background hover:border-border-hover hover:bg-muted/50",
              disabled && "cursor-not-allowed opacity-55 hover:border-border hover:bg-background"
            )}
          >
            <Checkbox.Root
              id={`category-${category.id}`}
              checked={isSelected}
              disabled={disabled}
              onCheckedChange={() => {
                if (!disabled) onToggle(category.id);
              }}
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isSelected
                  ? "border-accent bg-accent text-white"
                  : "border-border-hover bg-background"
              )}
            >
              <Checkbox.Indicator>
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
              </Checkbox.Indicator>
            </Checkbox.Root>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-foreground">
                {category.label}
              </span>
              <span
                className={cn(
                  "block text-[11px]",
                  isEmpty ? "text-muted-foreground/70" : "text-muted-foreground"
                )}
              >
                {countLabel}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
