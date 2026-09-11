import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function Spinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" aria-label={label}>
      <Loader2 className={cn("h-5 w-5 animate-spin text-primary", className)} />
    </span>
  );
}

export function PageLoader({ message = "Loading" }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <Spinner className="h-7 w-7" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} role="separator" />;
}
