import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RevealOnScroll } from "@/components/motion/reveal";

export default function CTASection() {
  return (
    <section className="bg-background px-4 py-24 sm:px-6">
      <RevealOnScroll className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-brand px-6 py-16 text-center text-white shadow-brand-lg sm:px-12">
          <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />

          <div className="relative">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-foreground/15 backdrop-blur">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>

            <p className="mt-6 text-sm font-semibold uppercase tracking-wider opacity-80">
              Your next opportunity is waiting
            </p>

            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Ready to be part of something technical?
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed opacity-90 sm:text-base">
              Discover hackathons, coding competitions, workshops, seminars,
              and other technical events happening on your campus.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/events">
                <Button
                  size="lg"
                  className="bg-background text-foreground shadow-lg hover:-translate-y-px hover:bg-background/90"
                >
                  Explore Events
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>

              <Link href="/register">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-brand-foreground/30 bg-transparent text-brand-foreground hover:bg-brand-foreground/10"
                >
                  Create an Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
}
