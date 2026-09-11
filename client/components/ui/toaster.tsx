"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

/*
 * Wraps sonner so the toasts inherit the app's tokens instead of
 * sonner's own palette, and follow the active theme.
 *
 * Use `toast` from "@/lib/toast" rather than window.alert — an
 * alert blocks the page and cannot be styled.
 */
export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      position="top-right"
      closeButton
      richColors={false}
      theme={(resolvedTheme as "light" | "dark") ?? "system"}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-border !bg-card !text-card-foreground !shadow-lg",
          title: "!text-sm !font-semibold",
          description: "!text-sm !text-muted-foreground",
          actionButton:
            "!rounded-lg !bg-primary !text-primary-foreground !text-xs !font-semibold",
          cancelButton:
            "!rounded-lg !bg-muted !text-muted-foreground !text-xs !font-medium",
          success: "!text-success",
          error: "!text-destructive",
        },
      }}
    />
  );
}
