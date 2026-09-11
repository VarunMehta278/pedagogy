"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

/*
 * Rendered as a placeholder until mounted. next-themes cannot know
 * the resolved theme during SSR, so rendering the real icon on the
 * first pass guarantees a hydration mismatch and a console error.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  /*
   * Every attribute that depends on the resolved theme has to wait
   * for mount, not just the icon. The server has no idea which
   * theme will win, so rendering the real label on the first pass
   * guarantees a hydration mismatch — which is exactly what it did
   * until this was fixed.
   */
  const label = !mounted
    ? "Toggle theme"
    : isDark
    ? "Switch to light theme"
    : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-lg",
        "text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        className
      )}
    >
      {!mounted ? (
        <span className="h-4 w-4" />
      ) : isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
