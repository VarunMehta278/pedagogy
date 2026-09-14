"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * One button, every variant the app needs.
 *
 * Two details do most of the work in making this feel expensive:
 * the 1px lift on hover paired with a shadow bloom, and the
 * active:translate-y-0 that snaps it back down on press, so the
 * control feels physical rather than painted on.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-xl font-semibold",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "active:translate-y-0",
  ].join(" "),
  {
    variants: {
      variant: {
        /*
         * The inset highlight on the filled variants is a hairline of
         * white along the top edge. It is what stops a solid-colour
         * button reading as a flat swatch.
         */
        default:
          "bg-primary text-primary-foreground btn-lit hover:-translate-y-px",
        brand:
          "bg-gradient-brand text-white btn-lit-brand hover:-translate-y-px",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-accent hover:-translate-y-px",
        outline:
          "border border-border bg-card text-foreground shadow-xs hover:border-primary/40 hover:bg-accent/60 hover:-translate-y-px",
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:-translate-y-px hover:shadow-md",
        subtle:
          "bg-brand-subtle text-accent-foreground hover:bg-accent",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3.5 text-[0.8125rem] [&_svg]:size-4",
        md: "h-11 px-5 text-sm [&_svg]:size-4",
        lg: "h-13 px-7 text-[0.9375rem] [&_svg]:size-5",
        icon: "h-10 w-10 [&_svg]:size-4",
        "icon-sm": "h-8 w-8 rounded-lg [&_svg]:size-3.5",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingText?: string;
  /*
   * Render the single child as the button instead of wrapping it.
   *
   * `<Button asChild><Link href="/events">Browse</Link></Button>`
   * gives a real anchor that carries the button styling. Wrapping
   * instead would nest an <a> inside a <button>, which is invalid
   * HTML — the browser recovers from it, but keyboard and screen
   * reader behaviour become unpredictable, and middle-click and
   * "open in new tab" stop working.
   */
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  block,
  loading = false,
  loadingText,
  asChild = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, block }), className);

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      className?: string;
    }>;

    /*
     * An anchor has no `disabled`, so the disabled state is carried
     * by aria-disabled plus the pointer-events class rather than a
     * property the element would silently drop.
     */
    const isDisabled = disabled || loading;

    return React.cloneElement(child, {
      ...props,
      className: cn(
        classes,
        isDisabled && "pointer-events-none opacity-50",
        child.props.className
      ),
      "aria-disabled": isDisabled || undefined,
    } as Record<string, unknown>);
  }

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

export { buttonVariants };
