"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/events", label: "Events" },
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the viewport grows back to desktop.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md transition-colors duration-300",
        "border-b",
        scrolled ? "border-border" : "border-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand">
            <GraduationCap className="h-[18px] w-[18px]" aria-hidden="true" />
          </div>

          <span className="text-lg font-bold tracking-tight">Pedagogy</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />

          <Link
            href="/login"
            className="hidden text-sm font-medium text-foreground transition-colors hover:text-primary sm:block"
          >
            Login
          </Link>

          <Link href="/register" className="hidden sm:block">
            <Button variant="brand" size="sm">
              Get Started
            </Button>
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent md:hidden"
          >
            {menuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "overflow-hidden border-t bg-background/95 backdrop-blur-md transition-[max-height] duration-300 ease-out md:hidden",
          menuOpen ? "max-h-96 border-border" : "max-h-0 border-transparent"
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-4 sm:px-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}

          <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-4">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              Login
            </Link>

            <ThemeToggle />
          </div>

          <Link href="/register" onClick={() => setMenuOpen(false)} className="mt-1">
            <Button variant="brand" size="md" block>
              Get Started
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
