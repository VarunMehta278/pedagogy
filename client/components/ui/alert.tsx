import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const TONES: Record<
  string,
  { wrap: string; icon: LucideIcon; iconClass: string }
> = {
  info: {
    wrap: "border-info/25 bg-info/8 text-foreground",
    icon: Info,
    iconClass: "text-info",
  },
  success: {
    wrap: "border-success/25 bg-success/8 text-foreground",
    icon: CheckCircle2,
    iconClass: "text-success",
  },
  warning: {
    wrap: "border-warning/30 bg-warning/10 text-foreground",
    icon: AlertTriangle,
    iconClass: "text-warning",
  },
  destructive: {
    wrap: "border-destructive/25 bg-destructive/8 text-foreground",
    icon: XCircle,
    iconClass: "text-destructive",
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: "info" | "success" | "warning" | "destructive";
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const config = TONES[tone];
  const Icon = config.icon;

  return (
    <div
      role={tone === "destructive" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3.5",
        config.wrap,
        className
      )}
    >
      <Icon
        className={cn("mt-0.5 h-4.5 w-4.5 shrink-0", config.iconClass)}
        aria-hidden="true"
      />

      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {children && (
          <div className={cn("text-sm text-muted-foreground", title && "mt-1")}>
            {children}
          </div>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
