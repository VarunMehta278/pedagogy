import * as React from "react";
import {
  CalendarClock,
  CheckCircle2,
  CircleDot,
  FileEdit,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";

/*
 * Event and registration status shown the same way on every screen.
 * Before this, each page invented its own colours, so "cancelled"
 * was red in one place and grey in another.
 */
type Tone = NonNullable<BadgeProps["variant"]>;

const EVENT_STATUS: Record<
  string,
  { label: string; tone: Tone; icon: LucideIcon }
> = {
  draft: { label: "Draft", tone: "muted", icon: FileEdit },
  published: { label: "Published", tone: "success", icon: CheckCircle2 },
  ongoing: { label: "Happening now", tone: "info", icon: CircleDot },
  completed: { label: "Completed", tone: "default", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", tone: "destructive", icon: XCircle },
};

const REGISTRATION_STATUS: Record<
  string,
  { label: string; tone: Tone; icon: LucideIcon }
> = {
  registered: { label: "Registered", tone: "info", icon: CalendarClock },
  attended: { label: "Attended", tone: "success", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", tone: "destructive", icon: XCircle },
};

export function StatusBadge({
  status,
  kind = "event",
  size = "md",
  showIcon = true,
  className,
}: {
  status?: string | null;
  kind?: "event" | "registration";
  size?: BadgeProps["size"];
  showIcon?: boolean;
  className?: string;
}) {
  if (!status) return null;

  const table = kind === "event" ? EVENT_STATUS : REGISTRATION_STATUS;

  const entry = table[status] ?? {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    tone: "muted" as Tone,
    icon: CircleDot,
  };

  const Icon = entry.icon;

  return (
    <Badge variant={entry.tone} size={size} className={className}>
      {showIcon && <Icon aria-hidden="true" />}
      {entry.label}
    </Badge>
  );
}

/* A quietly pulsing dot for anything live. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-info opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-info" />
      </span>
    </span>
  );
}
