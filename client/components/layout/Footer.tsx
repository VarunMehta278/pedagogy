import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { FaGithub, FaLinkedin, FaInstagram } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand">
                <GraduationCap className="h-[18px] w-[18px]" aria-hidden="true" />
              </div>

              <span className="text-lg font-bold tracking-tight">Pedagogy</span>
            </Link>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              The centralized technical event platform for campuses — event
              discovery, registration, QR attendance, results and verifiable
              certificates, connecting students, faculty, volunteers, judges
              and administrators in one place.
            </p>

            {/* Social Icons */}
            <div className="mt-5 flex gap-3">
              <a
                href="#"
                className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="GitHub"
              >
                <FaGithub className="h-4 w-4" />
              </a>

              <a
                href="#"
                className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="LinkedIn"
              >
                <FaLinkedin className="h-4 w-4" />
              </a>

              <a
                href="#"
                className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Instagram"
              >
                <FaInstagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Platform</h3>

            <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
              <Link href="/events" className="transition-colors hover:text-foreground">
                Events
              </Link>

              <Link href="/#how-it-works" className="transition-colors hover:text-foreground">
                How It Works
              </Link>

              <Link href="/login" className="transition-colors hover:text-foreground">
                Login
              </Link>

              <Link href="/register" className="transition-colors hover:text-foreground">
                Register
              </Link>
            </div>
          </div>

          {/* Connect — reuses the same social links above as a text
              column rather than adding new routes. */}
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Connect</h3>

            <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
              <a href="#" className="transition-colors hover:text-foreground">
                GitHub
              </a>

              <a href="#" className="transition-colors hover:text-foreground">
                LinkedIn
              </a>

              <a href="#" className="transition-colors hover:text-foreground">
                Instagram
              </a>
            </div>
          </div>

          {/*
            An "Information" column used to sit here linking to
            /about, /contact, /privacy and /terms. None of those
            routes exist, so every link 404'd. Re-add the column
            once the pages are written — the links are not the
            hard part, the policy text is.
          */}
        </div>

        {/* Bottom */}
        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Pedagogy. All rights reserved.</p>

          <p>Built for smarter campus events.</p>
        </div>
      </div>
    </footer>
  );
}
