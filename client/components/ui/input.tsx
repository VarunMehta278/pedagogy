import * as React from "react";

import { cn } from "@/lib/utils";

const fieldBase = [
  "w-full rounded-xl border border-input bg-card text-foreground",
  "placeholder:text-muted-foreground/70",
  "transition-all duration-200 ease-out",
  "hover:border-primary/30",
  "focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12",
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-muted",
  "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus:ring-destructive/15",
].join(" ");

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(fieldBase, "h-11 px-3.5 text-sm", className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(fieldBase, "min-h-28 resize-y px-3.5 py-3 text-sm", className)}
      {...props}
    />
  );
}

/*
 * A native select, restyled. The chevron is a background image so
 * the control keeps every bit of native keyboard and mobile
 * behaviour — a hand-rolled dropdown would lose all of it.
 */
export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        fieldBase,
        "h-11 cursor-pointer appearance-none bg-no-repeat py-0 pl-3.5 pr-10 text-sm",
        "bg-[length:1.25rem] bg-[position:right_0.625rem_center]",
        "bg-[image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn(
        "mb-2 block text-sm font-medium text-foreground",
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-destructive" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

export function FieldHint({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-1.5 text-xs text-muted-foreground", className)} {...props} />
  );
}

export function FieldError({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  if (!children) return null;

  return (
    <p
      role="alert"
      className={cn("mt-1.5 text-xs font-medium text-destructive", className)}
      {...props}
    >
      {children}
    </p>
  );
}
