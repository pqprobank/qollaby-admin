"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FilterBadgeProps {
  children: React.ReactNode;
  onRemove: () => void;
  className?: string;
}

export function FilterBadge({ children, onRemove, className }: FilterBadgeProps) {
  return (
    <Badge variant="secondary" className={cn("gap-1.5 pr-1", className)}>
      <span>{children}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove filter"
        className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground dark:hover:bg-white/10"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}
