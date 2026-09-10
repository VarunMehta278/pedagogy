import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground sm:px-12">
        <p className="text-sm font-semibold uppercase tracking-wider opacity-80">
          Your next opportunity is waiting
        </p>

        <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Ready to be part of something technical?
        </h2>

        <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 opacity-80 sm:text-base">
          Discover hackathons, coding competitions, workshops, seminars,
          and other technical events happening on your campus.
        </p>

        <Link
          href="/events"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-background px-6 py-3 text-sm font-semibold text-foreground transition-transform hover:scale-105"
        >
          Explore Events
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}