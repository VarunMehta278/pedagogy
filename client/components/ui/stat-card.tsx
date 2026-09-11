import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * The metric tile used on all four dashboards. The icon sits in a
 * tinted square rather than floating, and the number uses tabular
 * figures so a row of tiles lines up.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "brand" | "violet" | "success" | "warning" | "info" | "destructive";
  className?: string;
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-subtle text-primary",
    violet: "bg-violet-subtle text-violet",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/12 text-info",
    destructive: "bg-destructive/12 text-destructive",
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-5",
        "shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg",
        className
      )}
    >
      {/* A faint wash that warms up on hover. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          backgroundImage:
            "radial-gradient(20rem 10rem at 100% 0%, var(--brand-subtle), transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>

          <p className="tabular mt-2 text-3xl font-bold tracking-tight text-foreground">
            {value}
          </p>

          {hint && (
            <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>

        {Icon && (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              tones[tone]
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}
