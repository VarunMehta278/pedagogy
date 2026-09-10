import Link from "next/link";
import { FaGithub, FaLinkedin, FaInstagram } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-12">

        <div className="grid gap-10 md:grid-cols-4">

          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">
                P
              </div>

              <span className="text-xl font-bold">
                Pedagogy
              </span>
            </Link>

            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
              A smart technical event management platform that connects
              students, faculty, volunteers, judges, and administrators
              in one place.
            </p>

            {/* Social Icons */}
            <div className="mt-5 flex gap-3">
              <a
                href="#"
                className="rounded-lg border p-2 transition-colors hover:bg-muted"
                aria-label="GitHub"
              >
                <FaGithub className="h-4 w-4" />
              </a>

              <a
                href="#"
                className="rounded-lg border p-2 transition-colors hover:bg-muted"
                aria-label="LinkedIn"
              >
                <FaLinkedin className="h-4 w-4" />
              </a>

              <a
                href="#"
                className="rounded-lg border p-2 transition-colors hover:bg-muted"
                aria-label="Instagram"
              >
                <FaInstagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-sm font-semibold">
              Platform
            </h3>

            <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
              <Link href="/events" className="hover:text-foreground">
                Events
              </Link>

              <Link href="/#how-it-works" className="hover:text-foreground">
                How It Works
              </Link>

              <Link href="/login" className="hover:text-foreground">
                Login
              </Link>

              <Link href="/register" className="hover:text-foreground">
                Register
              </Link>
            </div>
          </div>

          {/* Information */}
          <div>
            <h3 className="text-sm font-semibold">
              Information
            </h3>

            <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
              <Link href="/about" className="hover:text-foreground">
                About Pedagogy
              </Link>

              <Link href="/contact" className="hover:text-foreground">
                Contact
              </Link>

              <Link href="/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>

              <Link href="/terms" className="hover:text-foreground">
                Terms of Use
              </Link>
            </div>
          </div>

        </div>

        {/* Bottom */}
        <div className="mt-10 flex flex-col gap-3 border-t pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © 2026 Pedagogy. All rights reserved.
          </p>

          <p>
            Built for smarter campus events.
          </p>
        </div>

      </div>
    </footer>
  );
}