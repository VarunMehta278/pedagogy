import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * Every empty list, failed load and missing record uses this, so
 * the app never shows a bare "No data" and never shows nothing at
 * all. An empty state should say what is missing and offer the one
 * action that would fix it.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "default",
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "default" | "destructive";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border",
        "bg-card/60 px-6 py-14 text-center",
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "mb-5 flex h-14 w-14 items-center justify-center rounded-2xl",
            tone === "destructive"
              ? "bg-destructive/10 text-destructive"
              : "bg-brand-subtle text-primary"
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}

      <h3 className="text-base font-semibold text-foreground">{title}</h3>

      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}

      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
